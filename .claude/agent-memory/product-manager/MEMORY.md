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

## Admin Phase Status (as of 2026-03-04)

- Phase 1 completed: Supabase client, types, HTTPS dev server, sidebar, metrics page (mock), SearchFilter, shadcn components, ESLint config
- Phase 3 (partial): Tiptap editor + image insert implemented -- extensions (CustomStarterKit, BulletList, Heading h2-h6, Link, Underline, CustomResizableImage), toolbar (Bold/Italic/Underline/Link/List/Image/Undo/Redo), /posts/new page (title+editor), SSR-safe container (isMounted+skeleton), ProseMirror CSS (OL nesting, link hover, img max-width)
- Image insert: CustomResizableImage (DOM NodeView, 4-corner resize handles, width % storage), UploadImage toolbar (blob URL temp, S3 presigned URL not yet), image output `<img style="width: X%; height: auto;" />`
- Tiptap HTML output uses inline styles on all elements -- critical Client impact: `insertInArticleAds()` in `features/post-detail/lib/ads.ts` uses Markdown `## ` regex, needs migration to `<h2>` pattern
- Post-editor remaining: meta form, Zod validation, S3 upload integration, image crop (react-image-crop), drag-and-drop/paste image, save (Server Action), edit page (/posts/[id]/edit), Placeholder extension
- Next: Phase 2 (auth), then remaining Phase 3 tasks

## Feature Specs Created

- `docs/place-i18n-specs.md` — place_name/address i18n (2026-03-05): DB schema change (post_translations add place_name, address nullable), LocalizedPost type adds translated_place_name/translated_address (separate from original), PlaceInfoCard shows translation + copies Korean original, Toast on non-ko copy, JSON-LD keeps Korean original, PlaceInfoCard field labels also i18n'd (place.category/name/address/price keys), search/feed data use translated place_name

## Documentation Patterns

- All docs in Korean with English technical terms
- docs/TODO.md: checklist format with Phase sections (completed/remaining), cross-references to spec docs
- Feature specs use table-based requirement IDs (AUTH-1, PE-1, MEDIA-1 etc.)
- Server Action vs CSR distinction table in each feature section
- admin-specs.md Section 10: implementation order table with status column
