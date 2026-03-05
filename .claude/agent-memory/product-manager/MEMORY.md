# Product Manager Agent Memory

## Project Context

- **Project**: eunminlog (couple blog platform)
- **Key docs**: `docs/admin-specs.md`, `docs/architecture.md`, `docs/database.md`, `docs/ui-specs.md`, `docs/seo-strategy.md`, `docs/theme.md`, `docs/ga4-tracking.md`, `docs/ci-cd.md`, `docs/TODO.md`

## User Decisions (confirmed)

- Admin auth: Supabase Auth email/password (no social login, no signup flow, 1-2 users)
- Editor: Tiptap (HTML output, not Markdown)
- CSR-first: Server Action only for presigned URL, Supabase writes, GitHub token
- GPT-4o translation: CSR direct call (Vercel Hobby 10s timeout workaround)
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
- DB: Supabase PostgreSQL (posts + post_translations tables)
- Media: S3 `media-eunminlog` bucket, CloudFront `media.eunminlog.site`
- CI/CD: GitHub Actions workflow_dispatch for build trigger
- Global UI pattern: Layout.astro contains 1x Toast + 1x ImageLightbox (shared/components/ui/)

## Admin Phase Status (as of 2026-03-05)

- Phase 1 completed: Supabase client, types, HTTPS dev server, sidebar, metrics page (mock), SearchFilter, shadcn components, ESLint config
- Phase 3 (major progress): Tiptap editor + form type + meta form + translation integration
  - Form type: `PostFormType = 'visit' | 'product-review'` -- UI-only concept (not stored in DB)
  - Layout order: 폼형식 -> 썸네일 -> 본문(title+editor) -> 카테고리 -> [visit전용필드] -> 3줄요약 -> 액션버튼
  - New components: CategorySelector, ThumbnailUpload (WebP convert), VisitFields (place/address/price)
  - 3줄 요약: generateSummary Server Action (mock), textarea + AI button
  - Toolbar now includes TextAlign (Left/Center/Right/Justify) + 13 SVG icons
  - Translation: extractFlaggedTerms + translatePost Server Actions, TranslationSheetContainer, TranslationPreviewSheet
- Image insert: CustomResizableImage (DOM NodeView, 4-corner resize handles, width % storage), UploadImage toolbar (blob URL temp)
- Tiptap HTML output uses inline styles -- critical Client impact: `insertInArticleAds()` needs `<h2>` regex migration
- Remaining: Zod validation, S3 upload, save action, edit page, Placeholder ext, toggles (sponsored/recommended/multilingual), rating, slug auto-gen

## Client PlaceInfoCard Changes (2026-03-05)

- rating prop removed, replaced with description prop (3줄 요약)
- StarRating.astro no longer imported (file kept for future use, still used in schema.ts JSON-LD)
- description displayed as `\n`-split `⋅` bullet list with `post.summary` i18n label (8 locales)
- ui-specs.md PlaceInfoCard section updated to reflect new props and layout

## Feature Specs Created

- `docs/place-i18n-specs.md` — place_name/address i18n (2026-03-05): DB schema change (post_translations add place_name, address nullable), LocalizedPost type adds translated_place_name/translated_address (separate from original), PlaceInfoCard shows translation + copies Korean original, Toast on non-ko copy, JSON-LD keeps Korean original, PlaceInfoCard field labels also i18n'd (place.category/name/address/price keys), search/feed data use translated place_name

## Documentation Patterns

- All docs in Korean with English technical terms
- docs/TODO.md: checklist format with Phase sections (completed/remaining), cross-references to spec docs
- Feature specs use table-based requirement IDs (AUTH-1, PE-1, MEDIA-1 etc.)
- Server Action vs CSR distinction table in each feature section
- admin-specs.md Section 10: implementation order table with status column
