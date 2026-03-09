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
- [x] 3줄 요약 — textarea + "요약 생성" AI 버튼 (GPT-5 Mini API 연동 완료)
- [x] 이미지 삽입 UI — CustomResizableImage 확장 (4코너 리사이즈, width % 저장), S3 presigned URL 업로드
- [x] 번역 기능 연동 — "번역본 생성" 버튼 → 고유명사 추출 → 번역 실행 → "번역본 확인하기" Sheet
- [x] 폼 검증 — react-hook-form + Zod, 버튼 클릭 시 검증 + focus + 에러 메시지
- [x] 미저장 변경사항 이탈 방지 — `beforeunload` + `<a>` 네이티브 네비게이션
- [x] 번역 버튼 다국어 조건 — 소분류의 `is_multilingual`이 true일 때만 표시
- [x] 이미지 alt 텍스트 관리 — ImageAltSheet UI, DB `image_alts` JSONB, 번역 파이프라인 연동
- [x] 썸네일 alt 텍스트 — ThumbnailUpload에 alt 입력 필드 추가, DB `thumbnail_alt` 컬럼, 번역 파이프라인 연동
- [x] 업로드 이미지 워터마크 — Canvas API로 'eunminlog' 대각선 패턴 합성
- [x] 포스트 저장 (Server Action → Supabase `posts` INSERT)
- [x] 포스트 편집 페이지 (`/posts/[id]/edit`) — 기존 데이터 로드 + 에디터 반영
- [x] slug 자동 생성 + 수동 편집

### Phase 3-1 — 번역 (완료)

- [x] 고유명사 추출 Server Action (`extractFlaggedTerms`) — 본문에서 고유명사 식별 + 번역 가이드 제공
- [x] 번역 실행 Server Action (`translatePost`) — 확인된 고유명사를 반영하여 다국어 번역
- [x] 고유명사 검토 Sheet (`TranslationSheetContainer`) — 고유명사 리스트 검토/수정 UI + 번역 실행
- [x] 번역 확인 Sheet (`TranslationSheet`) — 생성/수정 페이지 공용. 원문/번역 비교, 수정 감지(dirty tracking), 필드별·전체 재번역, API 요청 취소(AbortSignal)
- [x] 번역 결과 저장 (Server Action → Supabase `post_translations` UPSERT)
- [x] 번역 상태 관리 (locale별 진행/완료/실패 UI) — 실패 locale별 toast 알림 + "다시 시도" 버튼
- [x] 개별 locale 재번역 — `retrySingleLocale` Server Action
- [x] 제품 리뷰 필드 번역 — product_name, purchase_source, price_prefix GPT 번역 파이프라인 연동
- [x] dirty tracking 훅 (`useTranslationDirtyFields`) — 번역 시점 스냅샷/서버 원본 vs 현재 폼 값 비교
- [x] 섹션 기반 선택적 번역 — 본문 HTML 블록 노드 단위 분할 + 체크박스 시스템 + content_sections 머지 + 미번역 뱃지
- [x] 체크박스 상태 관리 훅 (`useTranslationCheckState`) — 전체 선택/indeterminate/개별 필드·섹션 체크
- [x] HTML 섹션 유틸리티 (`html-sections.ts`) — splitHtmlToSections, reassembleSections, compareSections
- [x] Checkbox indeterminate 상태 지원 (`shared/components/ui/checkbox.tsx`)

### Phase 4+ (완료)

- [x] GPT API 연동 — 번역+요약+용어 추출+슬러그+카테고리 번역 실제 API 호출 (GPT-5 Mini)
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
- [x] 카테고리 생성 페이지 유효성 검사 toast에서 인라인 에러 메시지로 변경 (대분류/소분류 모두)
- [x] 버튼 스타일 통일 (edit 페이지 submit 버튼)

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

### 문서 정비 (완료)

- [x] docs 민감 정보(DB 스키마, SQL, IAM 정책, API 설정) `secrets-reference.md`로 이전 — 각 docs 파일에서 링크로 대체

### Admin 미완료

- [ ] 핵심 지표 대시보드 DB 연동 — GA4 연동 후 MOCK 데이터 교체
- [x] 파비콘 적용

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
- [x] **연속 이미지 갤러리 CSS snap 변환** — Admin `data-type="image-carousel"` HTML을 Client PostLayout에서 carousel viewport/slide로 변환 (JS 초기화 + CSS)

## Client — 최근 완료 (2026-03-07)

- [x] **HR 스타일 수정** — `global.css`에 `[itemprop='articleBody'] hr` 스타일 추가 (`border-color: var(--color-gray-200)`)
- [x] **이미지 alt 태그 Client 주입** — `image_alts` JSONB를 DB에서 가져와 PostLayout에서 content HTML `<img>`에 alt 속성 주입. 다국어 번역된 alt 우선 사용
- [x] **카테고리 DB 연동** — `CATEGORY_SLUGS`/`SUB_CATEGORY_MAP` 하드코딩 제거. Supabase `categories` 테이블에서 동적으로 가져오도록 변경 (`features/post-feed/api/categories.ts`)
- [x] **검색 페이지 max-width** — `SearchUI.astro` 루트 div에 `w-full max-w-[688px]` 적용
- [x] **애드센스 가짜 지면 주석 처리** — 5곳 주석 처리. 복원 가이드: [`docs/ADSENSE-TODO.md`](ADSENSE-TODO.md)

## Admin — 최근 완료 (2026-03-09)

- [x] **섹션 기반 번역 컨트롤** — 본문 HTML을 top-level 블록 노드 단위 섹션으로 분할 (`html-sections.ts`), 필드/섹션별 체크박스 선택적 재번역 (`useTranslationCheckState`), `content_sections` 형식 GPT 응답 머지 (`mergeSelectiveResult`), 미번역 섹션 "미번역" 뱃지, shadcn/ui Checkbox indeterminate 상태 지원, 번역 프롬프트 HTML 태그 보호 규칙 강화

## Admin — 완료 (2026-03-07)

- [x] **GPT 프롬프트 중앙 집중화** — 각 feature 파일에 흩어져 있던 프롬프트를 `shared/constants/prompts.ts`로 통합 (5개: 요약, 슬러그, 용어추출, 번역, 카테고리번역)
- [x] **GPT 모델 통일** — `gpt-5-nano` / `gpt-4.1-nano` -> `gpt-5-mini`로 전체 통일 (5곳)
- [x] **프롬프트 내용 개선** — 요약: 자연스러운 연결 문장 3줄 (25~40자), 용어추출: 숫자/단위/공용 영단어 제외 강화, 번역: HTML 속성 보호 + 100% 번역 규칙 강조
- [x] **대분류 카테고리 다국어 지원** — 대분류 생성 시 다국어 체크박스 + 7개 언어 번역 입력 + AI 번역 버튼. `createParentCategory`에 `isMultilingual`, `translations` 파라미터 추가
- [x] **워터마크 불투명도 변경** — 0.15 -> 0.25
- [x] **`features/translation/api/actions.ts` 삭제** — Server Action -> 브라우저 직접 호출(`client.ts`)로 이전 완료
- [x] **3줄 요약 프롬프트 개선** — 띄어쓰기 규칙 + 완성형 문장 마무리 규칙 추가
- [x] **밑줄 스타일 제거** — Tiptap CustomUnderline에서 커스텀 스타일 제거, 브라우저 기본 `<u>` 사용
- [x] **모바일 UX 개선** — Sheet 스와이프 닫기 (좌→우/우→좌, 30% threshold, 실시간 translateX+overlay 연동), 모바일 사이드바 네비게이션 후 자동 닫기, 버튼 아이콘 추가 (Languages/Check/Plus) + 모바일 grid 레이아웃, 필터/버튼/테이블 모바일 크기 축소 (`max-md:text-xs`, `max-md:h-8/9`), 이미지 삭제 버튼 Lucide X SVG 아이콘, 세로 이미지 비율 깨짐 수정 (HTML width/height 속성 미렌더링 + height: auto 보장)

## SEO

- [x] `Layout.astro`의 `TEMP_NOINDEX = true` → `false`로 변경 (실제 콘텐츠 준비 완료 후)
- [ ] GSC URL 검사 도구로 주요 페이지 재색인 요청 (noindex 해제 후)

## Media Upload

- [x] 미디어 업로드 및 Pre-signed URL 로직 (S3 presigned URL + WebP 변환 + CDN URL)
- [x] 이미지 워터마크 — Canvas API로 'eunminlog' 대각선 패턴 합성
- [ ] S3 orphan 이미지 정리 — 게시글 미저장/삭제/수정 시 S3에 남는 미사용 이미지 처리 (S3 Lifecycle Policy 또는 별도 정리 스크립트)

## Client — UI

- [ ] Left Sidebar 프로필 영역 다듬기
- [x] 파비콘 적용

## SEO — Sitemap & robots.txt

- [x] `@astrojs/sitemap` integration 연동 (8 locale hreflang alternate, `/search/` 제외)
- [x] `robots.txt` Astro API Route 생성 (`User-agent: *`, `Allow: /`, sitemap URL 참조)

## SEO — OG Image

- [ ] 메인 페이지(`/`) OG 이미지 설정
- [ ] 카테고리/서브카테고리 인덱스 페이지 OG 이미지 설정

## Ads

- [ ] 애드센스 광고 호출 스크립트 추가 (플레이스홀더 → 실제 광고 코드 교체)

## Client — 협찬 페이지

- [ ] 협찬 페이지 통계 데이터 API 연동 — 현재 목데이터(월간 방문자, 게시된 리뷰, 콘텐츠 카테고리). GA4 API 연동하여 실제 데이터로 교체

## 향후 고려

- [ ] 게시글 폼 타입 필터링 — `posts` 테이블에 `form_type` enum 컬럼 추가 (`place`, `product`, `general`). 기존 데이터는 `place_name`/`product_name` null 체크로 마이그레이션. Admin 게시글 목록에 폼 타입 필터 추가
- [ ] 게시글 소프트 딜리트 — `deleted_at` 컬럼 추가, 삭제 후 복구 지원, S3 이미지 고아 방지, SEO 301 대응 여유 확보
