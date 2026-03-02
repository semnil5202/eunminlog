# Product Manager Agent Memory

## Project: eunmin-log (은민로그)

### Key Facts

- Couple blog platform: 맛집/카페/여행 reviews
- Monetization: Sponsored content + ad placement (SEO-driven traffic)
- Authors: Semin & Chaeun (2-person admin team)
- License: MIT, owner: 이세민

### Architecture

- Monorepo: pnpm workspaces + TurboRepo
- apps/admin: Next.js 15 (App Router, React 19) -- CSR + Server Action, port 3001
- apps/client: Astro 5 -- SSG only, port 4321
- DB: Supabase PostgreSQL, `posts` + `post_translations` tables
- AI: OpenAI GPT-4o for multilingual translation
- Deploy: GitHub Actions -> Astro SSG build -> AWS S3 + CloudFront
- Shared packages: tsconfig, eslint-config, config (future: types, ui)
- Styling: Tailwind CSS v4, shared theme via @eunmin-log/config/theme.css (@theme inline)

### Current Status (as of 2026-03-01)

- Phase: Scaffolding + theme + client UI components + full page routing + major refactoring complete (208 pages built)
- Implemented: monorepo, apps, shared packages, docs, Tailwind v4 theme, all UI components, all page routes (ko + 7 locales)
- Refactoring completed: PostLayout 336->179 lines, search.astro 272->52 lines, feature-based component extraction, shared utility dedup, arrow function convention
- Client features: post-feed, post-detail (PlaceInfoCard, NearbyPostList, PostBadges, ads.ts, schema.ts), search (SearchUI, search-data.ts)
- Client shared: ad/ (FixedAdsense, InFeedAdsense), ui/ (StarRating, SponsoredBadge), navigation/ (LanguageSelector, CategoryTree, Breadcrumb, SubCategoryTabs), layout/ (SponsoredPostItem, etc.), lib/ (date.ts, navigation.ts)
- Missing: Supabase connection (using mock data), editor, auth, real AdSense integration
- CI/CD: designed (docs/ci-cd.md) -- pending se implementation
- GA4 tracking strategy designed (docs/ga4-tracking.md) -- pending implementation

### Theme System

- Primary: Sage Green (base #A6BAA1, logo #6F8B68)
- Secondary: Soft Coral (base #D4A594, for sponsored/pick UI)
- Mapping: rose->primary, amber(sponsored)->secondary, amber(rating)->yellow, gray->gray
- Semantic tokens: primary/secondary aliases, label, line, background
- Documented in docs/theme.md

### Key Business Rules

- Categories: delicious (한식/양식/일식/주점), cafe (핫플/카공), travel (국내/해외/숙소)
- URL: /{category}/{sub_category}/{slug}
- Content types: normal, sponsored (is_sponsored), editor's pick (is_recommended)
- Strict UI rules: NO hamburger menu, NO drawer, NO infinite scroll
- PC: 3-column (left sidebar + main feed + right sidebar)
- Mobile: snap scroll header nav, SubCategoryTabs on category pages, in-feed ads at index 1,5, footer with full subcategory links

### Documentation

- docs/architecture.md -- system architecture, deploy flow
- docs/ui-specs.md -- PC/Mobile layout rules, component specs
- docs/database.md -- DB schema, index recommendations
- docs/seo-strategy.md -- SEO, JSON-LD, URL structure, image optimization
- docs/theme.md -- color palette, semantic tokens, usage guide
- docs/ga4-tracking.md -- GA4 event tracking strategy, event schema, implementation guide
- docs/ci-cd.md -- GitHub Actions CI/CD pipeline design (deploy-client.yml)

### Search Feature Decisions

- Client-side search: all posts embedded as JSON at build time, JS filters by title/description/place_name
- No server-side search, no DB queries at runtime
- Search triggered on Enter (form submit), not real-time
- URL updated via history.replaceState with ?q= param
- noindex, follow -- search results not crawled
- In-feed Adsense at result index 1 and 5
- Suggested keywords: place_name + category labels extracted at build time
- Headers (PC + Mobile): zero JavaScript, search button is simple <a> link to /search/

### AdSense Specifications

- PostLayout Fixed: mobile 300x50, PC 468x60 (centered)
- RightSidebar Fixed: 300x250 (PC only, sticky)
- In-Article: fluid h-300px, inserted before 2nd and last ## heading sections
- In-feed: fluid h-250px, at card index 1 and 3 (feed + search results)

### GA4 Analytics

- Measurement ID: G-QX8XPFX6YK (packages/config/site.ts)
- gtag.js installed in Layout.astro -- basic page_view auto-collected
- Strategy: gtag API direct calls (no React-based libraries)
- Events: Enhanced page_view (custom params), select_content (card click), ad_impression/ad_view/ad_click
- Implementation pattern: event delegation for clicks, IntersectionObserver for ad tracking
- Analytics code goes in shared/lib/analytics/ (gtag.ts, post-tracker.ts, ad-tracker.ts)
- 14 custom dimensions to register in GA4 console

### CI/CD

- Pipeline: GitHub Actions, single workflow `deploy-client.yml`
- Branch strategy: main -> prod (prod-eunminlog-static), develop -> dev (dev-eunminlog-static)
- AWS region: ap-northeast-2, CloudFront OAC, S3 public access blocked
- SITE_URL: needs env var support in astro.config.mjs (process.env.SITE_URL fallback to packages/config/site.ts)
- Supabase env vars: not needed yet (mock data), add when Supabase integration is done
- Secrets: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, PROD/DEV_CLOUDFRONT_DISTRIBUTION_ID

### Multilingual Conditional Processing (is_multilingual)

- Decision date: 2026-03-03 (updated approach)
- `posts.is_multilingual` (boolean, default true): controls per-post multilingual support
- false = Korean-only: no locale routes for post detail, no hreflang, no translation, no card in locale lists
- LanguageSelector: disabled state (CSS-only tooltip) for non-ko buttons on non-multilingual posts -- NO fallback page
- `/not-available/` page to be deleted (replaced by LanguageSelector disabled state)
- Locale nav filtering: hide categories/subcategories with 0 multilingual posts from sidebar/header on locale pages
- Locale path generation: category/subcategory index locale routes only generated when multilingual posts >= 1 in that classification
- Home (`/{locale}/`) always generated regardless
- Empty feed state: "Content coming soon" message when category/subcategory feed is empty (locale-translated)
- Non-multilingual posts excluded from locale feed JSON and locale search data
- Implementation order: Client mock first -> DB migration + Admin UI later (tracked in docs/TODO.md)

### Open Design Questions

- No tags/keywords table defined (but "Popular Tags" mentioned in UI specs)
