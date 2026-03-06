# Product Manager Agent Memory

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

## Admin Phase Status (as of 2026-03-06)

- Phase 1 completed: Supabase client, types, HTTPS dev server (--experimental-https), sidebar, metrics page (mock, RHF), SearchFilter (RHF register props), shadcn components, ESLint config
- Phase 3 (major progress): Tiptap editor + form type + meta form + translation integration
  - Form type: `PostFormType = 'visit' | 'product-review'` -- UI-only concept (not stored in DB)
  - Layout order: 폼형식 -> 썸네일 -> 본문(title+editor) -> 카테고리 -> [visit전용필드] -> 3줄요약 -> 액션버튼
  - New components: CategorySelector, ThumbnailUpload (WebP convert), VisitFields (place/address/price)
  - 3줄 요약: generateSummary Server Action (GPT-5 Nano API 연동 완료), textarea + AI button
  - Toolbar now includes TextAlign (Left/Center/Right/Justify) + 13 SVG icons
  - Translation: extractFlaggedTerms + translatePost + retrySingleLocale Server Actions, TranslationSheetContainer (0.8s auto-close), TranslationPreviewSheet (8 locale filter tabs, default en, failed locale retry button)
  - GPT-5 Nano API fully integrated (mock removed): summary, term extraction, translation all use real API
  - Translation performance: 7 locales parallel via Promise.allSettled, partial failure allowed, description included in translation, address locale-specific formatting
  - Failure fallback: toast.error on summary/extraction/translation failure, "번역본 재생성하기" button text change on extraction failure, per-locale retry in preview sheet
  - Form validation: react-hook-form + Zod (mode: 'onSubmit'). Buttons always enabled, click triggers Zod validation -> focus + error message. Korean error messages in Zod schema.
  - Label style: all labels `text-base font-bold` black + required `*` primary-600
  - Loading spinners: LoaderIcon animate-spin on summary/translation buttons
  - Translation UX: "용어 검토 계속하기" button for sheet re-open. "번역본 생성하기" always enabled (no description.trim() disabled), validates via Zod on click
- Post list page (`/posts`): SearchFilter (RHF) + table (title/published/modified) + sort dropdown (newest published/newest modified) + "새 글 작성" button. Sidebar routing updated: "게시글 작성/수정/삭제" -> `/posts`
- Category management page (`/categories`): SearchFilter.Query only, grouped parent-child table, "새 카테고리 생성" button, no pagination (pageSize 100)
- Image insert: CustomResizableImage (DOM NodeView, 4-corner resize handles, width % storage), UploadImage toolbar (blob URL temp)
- Tiptap HTML output uses inline styles -- critical Client impact: `insertInArticleAds()` needs `<h2>` regex migration
- Price field: price_prefix (text, optional) + price (number, required for visit). Display: "${prefix}${price.toLocaleString()}원"
- Admin toast: sonner library (`<Toaster position="top-right" richColors />` in layout.tsx)
- Admin button: cursor-pointer default, search button variant="outline"
- Remaining: S3 upload, save action, edit page, delete, Placeholder ext, toggles (sponsored/recommended/multilingual), rating, slug auto-gen, translation DB save
- Pending DB migrations: M-03~M-07 (price fields, category enum->text, categories table, index redesign). See docs/database.md Section 7
- Phase 5-1 completed: SearchFilter compound component refactoring (DateRange + Query sub-components) + Pagination shared component (max 9 pages, ellipsis group navigation, URL page query)
- Phase 5-2 completed: Category management page (`/categories`) -- group table (category/sub rows), SearchFilter.Query only, mock data, pageSize 100 (no pagination)
- Phase 5-3 completed: Applied Pagination to `/posts` + `/` pages (pageSize 10)
- admin-specs.md Section 4-7: category-management feature spec (CM-1~CM-10), Section 4-2-A: 게시글 수정 상세 스펙, Section 5-4: SearchFilter compound pattern, Section 5-5: Pagination spec
- Category edit: slug 수정 허용 (기존 불가→허용), is_multilingual 수정 불가, slug 변경시 경고 모달, 이름만 변경시 확인 모달
- Post edit: 다국어 게시글은 dirty 감지 → 번역 재생성 필수 → 수정 완료 버튼 번역 후 활성화
- Edit entry points: 테이블 row의 이름/제목을 `text-blue-600 underline` 하이퍼링크로 표시
- api-specs.md: getCategory(7.3) 추가, updateCategory(7.4) slug 수정 허용으로 변경

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
