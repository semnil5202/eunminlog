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
- Fallback page: `/not-available/` — JS reads locale from URL, swaps text client-side (same pattern as 404)
- LanguageSelector: `isMultilingual=false` → non-ko links go to `/not-available/`

### Feed / Search API
- Multilingual-aware functions in `posts.ts`: `getMultilingualPosts`, `getPaginatedMultilingualPosts`, etc.
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
