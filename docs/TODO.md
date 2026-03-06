# TODO

## Admin App

> 상세 스펙: [`docs/admin-specs.md`](admin-specs.md)

### Phase 1 (완료)

- [x] Supabase 클라이언트 설정 (browser: lazy init, server: service role)
- [x] 공유 타입 정의 (Post, PostTranslation, Category, SubCategory, TranslationLocale)
- [x] HTTPS 로컬 dev 서버 (`local-admin.eunminlog.site:4322`, mkcert)
- [x] shadcn/ui 컴포넌트 설치 (sidebar, button, input, table, select, calendar, popover, collapsible, separator, sheet, skeleton, tooltip)
- [x] 글로벌 사이드바 (AppSidebar — 5개 nav 그룹, Collapsible, 로고 "은민로그")
- [x] SidebarLayout 클라이언트 컴포넌트 래퍼 (`sidebar-layout.tsx`)
- [x] 핵심 지표 페이지 (`/` — 게시글 조회수/추천수/댓글수, mock 데이터, sort dropdown)
- [x] 공유 SearchFilter 컴포넌트 (날짜 범위 + 검색 + children 확장)
- [x] 라우트 구조 확립 (flat, route group 미사용)
- [x] ESLint 설정 (.cjs, shadcn 생성 파일 예외)
- [x] placeholder 페이지: `/dashboard`, `/posts/new`, `/posts/[id]/edit`

### Phase 2 (완료)

- [x] Supabase Auth 로그인/로그아웃 (email/password)
- [x] 인증 가드 (비인증 시 로그인 리다이렉트)

### Phase 3 — Tiptap 에디터 + 폼 (완료)

- [x] Tiptap 에디터 기본 구현 — Extension 설정, 툴바 (Bold/Italic/Underline/Link/List/TextAlign/Undo/Redo), HTML 인라인 스타일 출력
- [x] 에디터 페이지 (`/posts/new`) — 폼 형식 + 메타 폼 + Tiptap 에디터 + 번역 연동
- [x] SSR-safe 에디터 래핑 — `isMounted` 패턴 + `TiptapEditorSkeleton` 로딩
- [x] ProseMirror CSS — focus outline, link hover, ordered list nesting (decimal/lower-alpha/lower-roman)
- [x] 폼 형식 (Form Type) — `visit` (체험 방문) / `product-review` (제품 리뷰) select. 체험 방문 선택 시 장소/주소/가격대 필드 표시
- [x] 카테고리/서브카테고리 select — `CategorySelector` 컴포넌트, 동적 서브카테고리 매핑
- [x] 썸네일 업로드 — `ThumbnailUpload` 컴포넌트 (WebP 변환, S3 CDN URL)
- [x] 체험 방문 전용 필드 — `VisitFields` 컴포넌트 (장소명, 주소, 가격대: 만원 단위)
- [x] 3줄 요약 — textarea + "요약 생성" AI 버튼 (GPT-5 Nano API 연동 완료)
- [x] 이미지 삽입 UI — CustomResizableImage 확장 (4코너 리사이즈, width % 저장), S3 presigned URL 업로드
- [x] 번역 기능 연동 — "번역본 생성" 버튼 → 고유명사 추출 → 번역 실행 → "번역본 확인하기" Sheet
- [x] 폼 검증 — react-hook-form + Zod, 버튼 클릭 시 검증 + focus + 에러 메시지
- [x] 미저장 변경사항 이탈 방지 — `beforeunload` + `<a>` 네이티브 네비게이션
- [x] 번역 버튼 다국어 조건 — 소분류의 `is_multilingual`이 true일 때만 표시
- [x] 이미지 alt 텍스트 관리 — ImageAltSheet UI, DB `image_alts` JSONB, 번역 파이프라인 연동
- [x] 업로드 이미지 워터마크 — Canvas API로 'eunminlog' 대각선 패턴 합성
- [x] 포스트 저장 (Server Action → Supabase `posts` INSERT)
- [x] 포스트 편집 페이지 (`/posts/[id]/edit`) — 기존 데이터 로드 + 에디터 반영
- [x] slug 자동 생성 + 수동 편집

### Phase 3-1 — 번역 (완료)

- [x] 고유명사 추출 Server Action (`extractFlaggedTerms`) — 본문에서 고유명사 식별 + 번역 가이드 제공
- [x] 번역 실행 Server Action (`translatePost`) — 확인된 고유명사를 반영하여 다국어 번역
- [x] 고유명사 검토 Sheet (`TranslationSheetContainer`) — 고유명사 리스트 검토/수정 UI + 번역 실행
- [x] 번역 미리보기 Sheet (`TranslationPreviewSheet`) — 번역 결과 확인 UI (언어 필터 8개, 기본 영어, 장소/주소 포함)
- [x] 번역 결과 저장 (Server Action → Supabase `post_translations` UPSERT)
- [x] 번역 상태 관리 (locale별 진행/완료/실패 UI) — 실패 locale별 toast 알림 + "다시 시도" 버튼
- [x] 개별 locale 재번역 — `retrySingleLocale` Server Action

### Phase 4+ (완료)

- [x] GPT-5 Nano API 연동 — 번역+요약+용어 추출 실제 API 호출
- [x] 미디어 업로드 (S3 Pre-signed URL)
- [x] 게시글 목록 페이지 (`/posts`) — SearchFilter + 테이블 + 정렬 + Pagination
- [x] 게시글 삭제 (확인 다이얼로그 포함)
- [x] GitHub Actions 빌드 자동 트리거 — 게시글 작성/수정, 카테고리 생성/수정/삭제 시 `workflow_dispatch` 자동 호출

### Phase 5-1 — SearchFilter + Pagination (완료)

- [x] SearchFilter 컴파운드 컴포넌트 — `SearchFilter.DateRange` + `SearchFilter.Query` 서브 컴포넌트
- [x] Pagination 공유 컴포넌트 (`shared/components/pagination/Pagination.tsx`)
- [x] `/posts` 게시글 목록에 Pagination 적용
- [x] `/` 핵심 지표에 Pagination 적용

### Phase 5-2 — 카테고리 관리 페이지 (완료)

- [x] 카테고리 관리 페이지 (`/categories`) — 대분류-소분류 그룹 테이블
- [x] DB 동적 카테고리 조회 (`fetchCategoryOptions`)
- [x] 카테고리 생성 (`/categories/new`) — 대분류/소분류 생성 + 슬러그 유효성 검사
- [x] 카테고리 수정 (`/categories/[id]`) — 이름/슬러그 수정 + posts 동기화
- [x] 카테고리 삭제 — 다중 선택 삭제, 게시글 포함 시 차단, 소분류 있는 대분류 차단

### 301 Redirect — Slug 변경 시 이전 URL 리다이렉트 (완료)

> 상세 스펙: [`docs/redirect-specs.md`](redirect-specs.md)

- [x] DB: `posts`, `categories` 테이블 `prev_slug` 컬럼 추가
- [x] Admin: `updatePost`, `updateCategory` slug 변경 감지 시 `prev_slug` 자동 저장
- [x] Admin: slug 변경 시 경고 모달

**인프라 — CF Function + 빌드 파이프라인:**

- [ ] CF Function 템플릿 작성 (`infra/cf-functions/viewer-request.js.template`) — 기존 URI→index.html 매핑 + 리다이렉트 매핑 로직
- [ ] 빌드 스크립트: Supabase에서 prev_slug NOT NULL인 데이터 조회 → 리다이렉트 매핑 JSON 생성 → CF Function 코드에 인라인 삽입
- [ ] GitHub Actions: CF Function 업데이트 Step 추가 (update-function + publish-function)
- [ ] IAM 정책 업데이트: `cloudfront:DescribeFunction`, `cloudfront:UpdateFunction`, `cloudfront:PublishFunction` 권한 추가
- [ ] GitHub Secrets 등록: `PROD_CF_FUNCTION_NAME`, `DEV_CF_FUNCTION_NAME`
- [ ] Supabase 빌드 타임 접속 정보 GitHub Secrets 등록 (리다이렉트 매핑 조회용)

### Admin 미완료

- [ ] 핵심 지표 대시보드 DB 연동 — GA4 연동 후 MOCK 데이터 교체

## Client: Tiptap HTML Viewer 대응

> Admin Tiptap 에디터가 출력하는 HTML을 Client(Astro SSG)에서 올바르게 렌더링하기 위한 작업 목록.
> 에디터 출력 포맷 상세: [`docs/admin-specs.md`](admin-specs.md) Section 4-2.

### P0 (필수)

- [ ] **`insertInArticleAds()` Markdown → HTML 마이그레이션** (Critical)
  - **현재**: `features/post-detail/lib/ads.ts`에서 `markdown.split(/(?=^## )/m)`으로 Markdown `## ` 헤딩 기준 분할
  - **문제**: Tiptap 출력은 `<h2 style="...">` HTML 태그이므로 기존 정규식 매칭이 실패
  - **해결**: 정규식을 `(?=<h2[\s>])` 패턴으로 변경

- [ ] **Link `target="_blank"` 처리**
  - Tiptap 출력 `<a>` 태그에 `target="_blank"`가 없음
  - 빌드 타임에 `content` HTML 파싱하여 외부 링크에 `target="_blank" rel="noopener noreferrer"` 추가

### P1 (중요)

- [ ] **Tailwind Typography vs 인라인 스타일 충돌 정리**
- [ ] **반응형 Typography (모바일 heading 크기)**

### P2 (선택)

- [ ] **Underline 클래스 호환성** — Tailwind purge safelist에 `underline` 추가 권장
- [ ] **리사이즈된 이미지의 반응형 대응** — 모바일 최소 너비 설정 검토
- [ ] **연속 이미지 갤러리 CSS snap 변환**

## SEO

- [ ] `Layout.astro`의 `TEMP_NOINDEX = true` → `false`로 변경 (실제 콘텐츠 준비 완료 후)
- [ ] GSC URL 검사 도구로 주요 페이지 재색인 요청 (noindex 해제 후)

## Media Upload

- [x] 미디어 업로드 및 Pre-signed URL 로직 (S3 presigned URL + WebP 변환 + CDN URL)
- [x] 이미지 워터마크 — Canvas API로 'eunminlog' 대각선 패턴 합성
- [ ] S3 orphan 이미지 정리 — 게시글 미저장/삭제/수정 시 S3에 남는 미사용 이미지 처리 (S3 Lifecycle Policy 또는 별도 정리 스크립트)

## SEO — Sitemap

- [ ] sitemap.xml 생성 (Astro SSG 빌드 타임)

## Ads

- [ ] 애드센스 광고 호출 스크립트 추가 (플레이스홀더 → 실제 광고 코드 교체)
