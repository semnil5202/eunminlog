# Product Manager Agent Memory

## Pending Actions

- **secrets-reference.md 실제 값 등록 필요**: `docs/secrets-reference.md`에 DB 스키마, SQL 쿼리, IAM 정책, API 설정 등의 구조/스펙이 이전되었으나, 실제 민감한 값(API 키, 시크릿, 비밀번호, Distribution ID 등)은 아직 채워지지 않았다. 운영 환경 배포 전까지 반드시 실제 시크릿 값을 등록해야 한다. (2026-03-07 기록)

## Project Context

- **Project**: eunminlog (couple blog platform)
- **Key docs**: `docs/admin-specs.md`, `docs/architecture.md`, `docs/database.md`, `docs/ui-specs.md`, `docs/seo-strategy.md`, `docs/theme.md`, `docs/ga4-tracking.md`, `docs/ci-cd.md`, `docs/TODO.md`

## User Decisions (confirmed)

- Admin auth: Supabase Auth email/password (no social login, no signup flow, 1-2 users)
- Editor: Tiptap (HTML output, not Markdown)
- CSR-first: Server Action only for presigned URL, Supabase writes, GitHub token, GPT API calls
- GPT-5 Nano translation+summary+term extraction: Edge Runtime API Route + streaming (Server Action에서 전환, 2026-03-06). `OPENAI_API_KEY` server-only env. `response_format: { type: 'json_object' }`. 7 locales 브라우저 병렬 fetch via `Promise.allSettled`. Partial failure allowed (`TranslationResult.failed?: boolean`). 요약은 실시간 스트리밍 (타이핑 효과). API Routes: `/api/summary`, `/api/slug`, `/api/extract-terms`, `/api/translate`.
- Media gallery: Tiptap manages image insert/delete/order, Client renders consecutive images as CSS snap gallery (B approach)
- Vercel Hobby plan is sufficient for admin
- Content format: HTML (Tiptap) -- database.md already updated to "HTML"
- Admin route structure: flat (no route groups), sidebar globally applied
- No Co-Authored-By in commits
- shadcn/ui for admin UI components (Radix UI + Tailwind)

## Architecture Notes

- Admin: Next.js 15, App Router, React 19, HTTPS dev at local-admin.eunminlog.site:4322 (mkcert)
- Admin UI: shadcn/ui components at src/components/ui/, shared components at src/shared/
- Admin layout: SidebarLayout (client component) wraps all pages, AppSidebar with 5 nav groups
- Client: Astro 5 SSG (already implemented), HTTPS dev at local-client.eunminlog.site:4321 (mkcert + Vite)
- Both apps: `pnpm setup:local` (root) runs setup scripts for both
- DB: Supabase PostgreSQL (posts + post_translations + categories tables)
- Media: S3 `media-eunminlog` bucket, CloudFront `media.eunminlog.site`
- CI/CD: GitHub Actions workflow_dispatch for build trigger
- Global UI pattern: Layout.astro contains 1x Toast + 1x ImageLightbox + 1x CookieConsentBanner (shared/components/ui/ + features/consent/)
- Logo text: `SITE_NAME_KO`("은민로그") for ko, `SITE_NAME_EN`("eunminlog") for others (packages/config/site.ts)

## Admin Phase Status (as of 2026-03-07)

- All phases (1~5) completed. DB migrations M-01~M-10 all applied.
- Summary prompt updated: spacing + complete sentence rules (2026-03-07)
- Underline: browser default `<u>` style (custom removed)
- Image carousel: Admin `data-type="image-carousel"` → Client PostLayout JS transforms to carousel
- Client categories: dynamic from Supabase `categories` table (hardcoded CATEGORY_SLUGS/SUB_CATEGORY_MAP removed)
- Client image alt injection: `image_alts` JSONB → PostLayout `<img>` alt attribute injection (translated alt preferred)
- AdSense placeholders: all 5 spots commented out, restoration guide at `docs/ADSENSE-TODO.md`

## Client PlaceInfoCard Changes (2026-03-05, updated 2026-03-06)

- rating prop removed, replaced with description prop (3줄 요약) + translatedDescription
- StarRating.astro no longer imported (file kept for future use, still used in schema.ts JSON-LD)
- description displayed as `\n`-split `⋅` bullet list with `post.summary` i18n label (8 locales)
- border-radius removed, dt width w-20 (80px)
- copy buttons use `data-copy` + `data-toast` pattern (Toast.astro event delegation)
- Toast.astro: duration 4s, whitespace-pre-line for multiline messages
- Translation key: `place.copyToast` (NOT `place.copyOriginal` -- specs updated 2026-03-05)
- Price: `place.currency` i18n (원/won/ウォン etc.) + `place.targetCurrency` for Google currency converter link
- NearbyPostList: `nearbyLabel` prop removed
- Sponsor page: "협찬 리뷰" -> "제품 리뷰" naming in content.ts

## Feature Specs Created

- `docs/place-i18n-specs.md` — place_name/address i18n (2026-03-05, updated 2026-03-05)
- `docs/api-specs.md` — Admin API specs (GPT-5 Nano, 번역 파이프라인 GPT/DB 분리, 카테고리 CRUD, listPosts pagination)
- `docs/gpt-prompts.md` — GPT prompt design doc (summary generation, term extraction, post translation)
- `docs/cookie-consent-specs.md` — Cookie Consent + AdSense NPA 연동 (2026-03-06, 구현 완료)

## Key Business Rules

- Categories: delicious (한식/양식/일식/주점), cafe (핫플/카공), travel (국내/해외/숙소)
- URL: /{category}/{sub_category}/{slug} (ko), /{locale}/{category}/{sub_category}/{slug} (i18n)
- Content types: normal, sponsored (is_sponsored), editor's pick (is_recommended)
- Monetization: Sponsored content + ad placement (SEO-driven traffic)
- Authors: Semin & Chaeun (2-person admin team)
- Strict UI rules: NO hamburger menu, NO drawer, NO infinite scroll

## Theme System

- Primary: Sage Green (base #A6BAA1, logo #6F8B68)
- Secondary: Soft Coral (base #D4A594, for sponsored/pick UI)

## Documentation Patterns

- All docs in Korean with English technical terms
- docs/TODO.md: checklist format with Phase sections (completed/remaining), cross-references to spec docs
- Feature specs use table-based requirement IDs (AUTH-1, PE-1, MEDIA-1 etc.)
- Server Action vs CSR distinction table in each feature section
- admin-specs.md Section 10: implementation order table with status column
