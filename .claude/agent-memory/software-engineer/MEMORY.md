# SE Agent Memory

## Project: eunmin-log (은민로그)

### Stack
- Client: Astro 5 (SSG), `apps/client/`
- Admin: Next.js 15 App Router, `apps/admin/`
- DB: Supabase PostgreSQL (mock data 기반 개발)
- Monorepo: pnpm workspaces + Turbo

### Architecture Patterns
- Shared types: `apps/client/src/shared/types/`
- Feature API: `apps/client/src/features/{feature}/api/`
- Mock data: `apps/client/src/features/post-feed/mock/posts.ts`
- Layout chain: `PostLayout.astro` → `Layout.astro` → `BaseHead.astro` → `Hreflang.astro`
- Header chain: `Layout.astro` → `Header.astro` → `PCHeader.astro`/`MobileHeader.astro` → `LanguageSelector.astro`

### Key i18n Patterns
- Default locale: `ko` (no prefix). Others: `/en/`, `/ja/`, `/zh-CN/`, `/zh-TW/`, `/id/`, `/vi/`, `/th/`
- `is_multilingual: boolean` on Post type controls multilingual behavior
- `is_multilingual: false` → no locale paths, no hreflang tags, excluded from multilingual feeds/search
- Korean (ko) paths always generated regardless of `is_multilingual`
- LanguageSelector: `isMultilingual=false` → non-ko buttons are `disabled` (CSS opacity + cursor-not-allowed) with CSS-only tooltip
- `/not-available/` page removed — disabled UX in LanguageSelector replaces it
- Locale category/sub-category paths not generated if no multilingual posts exist (filtered in getStaticPaths)
- PCHeader/MobileHeader/CategoryTree filter categories by `getMultilingualCategories()` when `locale !== 'ko'`

### Feed / Search API
- Multilingual-aware functions in `posts.ts`: `getMultilingualPosts`, `getPaginatedMultilingualPosts`, etc.
- `getMultilingualCategories()` → CategorySlug[] with ≥1 multilingual post
- `getMultilingualSubCategories(category)` → string[] with ≥1 multilingual post in that category
- Feed JSON API (`api/feed/[...path].json.ts`) uses multilingual functions for non-ko locales
- `[locale]/search.astro` uses `getMultilingualPosts()` (not `getAllPosts()`)

### Build Command
```bash
pnpm --filter @eunmin-log/client build
```

### Comment Policy
- No `// PERF:`, `// SEO:`, `// COST:` tags in code
- Pages: 1-line JSDoc at file top only
- Components: 1-2 line JSDoc describing what it does
