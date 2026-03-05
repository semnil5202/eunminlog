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

### Phase 3 — Tiptap 에디터 + 폼 (부분 완료)

- [x] Tiptap 에디터 기본 구현 — Extension 설정, 툴바 (Bold/Italic/Underline/Link/List/TextAlign/Undo/Redo), HTML 인라인 스타일 출력
- [x] 에디터 페이지 (`/posts/new`) — 폼 형식 + 메타 폼 + Tiptap 에디터 + 번역 연동
- [x] SSR-safe 에디터 래핑 — `isMounted` 패턴 + `TiptapEditorSkeleton` 로딩
- [x] ProseMirror CSS — focus outline, link hover, ordered list nesting (decimal/lower-alpha/lower-roman)
- [x] 폼 형식 (Form Type) — `visit` (체험 방문) / `product-review` (제품 리뷰) select. 체험 방문 선택 시 장소/주소/가격대 필드 표시
- [x] 카테고리/서브카테고리 select — `CategorySelector` 컴포넌트, 동적 서브카테고리 매핑
- [x] 썸네일 업로드 — `ThumbnailUpload` 컴포넌트 (WebP 변환, blob URL 미리보기, 삭제)
- [x] 체험 방문 전용 필드 — `VisitFields` 컴포넌트 (장소명, 주소, 가격대: 만원 단위)
- [x] 3줄 요약 — textarea + "요약 생성" AI 버튼 (Server Action `generateSummary` -- 현재 mock)
- [x] 이미지 삽입 UI — CustomResizableImage 확장 (4코너 리사이즈, width % 저장), UploadImage 툴바 버튼 (blob URL 임시 사용)
- [x] 번역 기능 연동 — 에디터 페이지에서 "번역본 생성" 버튼 → 고유명사 추출 → 번역 실행 → "번역본 확인하기" Sheet
- [x] 폼 검증 — react-hook-form + Zod, 버튼 클릭 시 검증 + focus + 에러 메시지 (공통 필드 + visit 전용 필드 + 번역 완료 조건)
- [x] Label 스타일 통일 — 모든 label 검은색 `text-base font-bold` + 필수값 `*` primary-600
- [x] Loading spinner — 요약 생성/번역본 생성하기 버튼에 `LoaderIcon animate-spin` 적용
- [x] 번역 Sheet UX — 번역 완료 시 0.8초 후 자동 닫힘, Sheet 닫은 후 "용어 검토 계속하기" 재오픈, 3줄 요약 비어있으면 번역 비활성화
- [x] 번역본 확인 Sheet — 언어 필터 탭 (8개 locale), 기본값 영어, 제목/장소/주소/본문 label 표시
- [x] 폼 유효성 검사 (Zod schema + react-hook-form) — mode: 'onSubmit', 한국어 에러 메시지, focus 연동
- [ ] 이미지 S3 업로드 연동 — blob URL → S3 presigned URL 방식으로 전환 (Phase 4 Media Upload 섹션 연동)
- [ ] 이미지 크롭 기능 (react-image-crop 활용 검토)
- [ ] 드래그앤드롭/붙여넣기 이미지 처리 (Tiptap Drop/Paste 핸들러)
- [ ] 포스트 저장 (Server Action → Supabase `posts` INSERT)
- [ ] 포스트 편집 페이지 (`/posts/[id]/edit`) — 기존 데이터 로드 + 에디터 반영
- [ ] Placeholder Extension 적용 (빈 에디터 가이드 텍스트)
- [ ] is_sponsored / is_recommended / is_multilingual 토글
- [ ] rating 입력 (1.0-5.0, 0.5 단위)
- [ ] slug 자동 생성 + 수동 편집

### Phase 2 (미구현)

- [ ] Supabase Auth 로그인/로그아웃 (email/password)
- [ ] 인증 가드 (비인증 시 로그인 리다이렉트)

### Phase 3-1 — 번역 (부분 완료)

- [x] 고유명사 추출 Server Action (`extractFlaggedTerms`) — 본문에서 고유명사 식별 + 번역 가이드 제공
- [x] 번역 실행 Server Action (`translatePost`) — 확인된 고유명사를 반영하여 다국어 번역
- [x] 고유명사 검토 Sheet (`TranslationSheetContainer`) — 고유명사 리스트 검토/수정 UI + 번역 실행
- [x] 번역 미리보기 Sheet (`TranslationPreviewSheet`) — 번역 결과 확인 UI (언어 필터 8개, 기본 영어, 장소/주소 포함)
- [x] 에디터 페이지 연동 — "번역본 생성하기" / "용어 검토 계속하기" / "번역본 확인하기" 버튼
- [x] 번역 Sheet UX — 번역 완료 0.8초 자동 닫힘, Sheet 닫은 후 "용어 검토 계속하기" 재오픈
- [x] GPT 프롬프트 설계서 작성 (`docs/gpt-prompts.md`) — 요약 생성, 용어 추출, 본문 번역 3가지 프롬프트
- [ ] 번역 결과 저장 (Server Action → Supabase `post_translations` UPSERT)
- [ ] 번역 상태 관리 (locale별 진행/완료/실패 UI)
- [ ] 개별 locale 재번역

### Phase 4+ (미구현)

- [ ] GPT-5 Nano API 연동 — 번역+요약 mock → 실제 API 호출 전환 (OPENAI_API_KEY env 설정 필요)
- [ ] 미디어 업로드 (S3 Pre-signed URL) — 아래 Media Upload 섹션과 연동
- [ ] 포스트 관리 대시보드 (목록, 삭제)
- [ ] GitHub Actions 빌드 트리거
- [ ] is_multilingual 토글 — 아래 i18n 섹션과 연동
- [ ] 핵심 지표 GA4 API 연동 (mock → 실제 데이터)

## Client: Tiptap HTML Viewer 대응

> Admin Tiptap 에디터가 출력하는 HTML을 Client(Astro SSG)에서 올바르게 렌더링하기 위한 작업 목록.
> 에디터 출력 포맷 상세: [`docs/admin-specs.md`](admin-specs.md) Section 4-2.

### 현재 상태 분석

Client `PostLayout.astro`는 `prose prose-gray prose-lg` (Tailwind Typography)로 본문을 렌더링한다. Tiptap HTML은 인라인 스타일을 포함하므로, Tailwind Typography 스타일과 인라인 스타일이 공존하게 된다. 인라인 스타일은 CSS specificity에서 우선하므로 대부분의 heading/list/link 스타일은 에디터 출력 그대로 표시된다. 그러나 아래 항목들은 추가 대응이 필요하다.

### P0 (필수)

- [ ] **`insertInArticleAds()` Markdown → HTML 마이그레이션** (Critical)
  - **현재**: `features/post-detail/lib/ads.ts`에서 `markdown.split(/(?=^## )/m)`으로 Markdown `## ` 헤딩 기준 분할
  - **문제**: Tiptap 출력은 `<h2 style="...">` HTML 태그이므로 기존 정규식 매칭이 실패
  - **해결**: 정규식을 `(?=<h2[\s>])` 패턴으로 변경하여 `<h2>` 또는 `<h2 style="...">`을 매칭
  - 기존 Markdown 포스트가 있다면 하위 호환도 고려 (Markdown `## `과 HTML `<h2>` 둘 다 매칭하는 union 정규식, 또는 마이그레이션 완료 후 Markdown 패턴 제거)

- [ ] **Ordered List 중첩 레벨 CSS**
  - 에디터 내부에서는 `.ProseMirror > ol` 셀렉터로 처리하지만, Client에는 ProseMirror 래퍼가 없음
  - `[itemprop='articleBody']` 또는 `.prose` 컨테이너 기준으로 동일한 CSS 적용 필요
  - `global.css` 또는 `PostLayout.astro` 스코프에 추가:
    ```css
    [itemprop='articleBody'] > ol {
      list-style-type: decimal;
    }
    [itemprop='articleBody'] ol ol,
    [itemprop='articleBody'] ul ol {
      list-style-type: lower-alpha;
    }
    [itemprop='articleBody'] ol ol ol,
    [itemprop='articleBody'] ul ol ol {
      list-style-type: lower-roman;
    }
    ```

- [ ] **Link `target="_blank"` 처리**
  - Tiptap 출력 `<a>` 태그에 `target="_blank"`가 없음
  - 외부 링크 클릭 시 현재 페이지를 벗어나는 문제 발생
  - 해결 방안 (택 1):
    - **(A) 빌드 타임 변환**: `PostLayout.astro` frontmatter에서 `content` HTML을 파싱하여 `<a>` 태그에 `target="_blank" rel="noopener noreferrer"` 추가
    - **(B) 클라이언트 JS**: `[itemprop='articleBody'] a` 셀렉터로 이벤트 위임하여 `target="_blank"` 동적 설정
    - **권장**: (A) 빌드 타임 변환 -- SSG 특성상 한 번만 처리하면 됨, JS 불필요

- [ ] **본문 컨테이너 max-width 확인**
  - 에디터 `max-w-[688px]`과 Client 뷰어 너비가 일치해야 인라인 스타일(특히 heading font-size)이 의도된 비율로 표시됨
  - 현재 `PostLayout.astro` main은 3-column grid의 `1fr`이므로, 게시글 본문 `<article>` 또는 `.prose` 컨테이너에 `max-w-[688px]` 제한이 필요한지 검토

### P1 (중요)

- [ ] **Link hover 색상**
  - 현재 `PostLayout.astro`에 `hover:prose-a:underline`이 있으나, Tiptap 링크는 이미 `text-decoration: underline` 인라인 스타일 포함
  - hover 시 색상 변경이 필요하면 `[itemprop='articleBody'] a:hover { color: var(--color-primary-strong); }` 추가
  - 단, Tiptap 인라인 스타일 `color: #5e83fe`와 Tailwind Typography `prose-a:text-primary-600`이 충돌 -- 인라인 스타일이 우선하므로, hover 색상은 `!important` 또는 별도 CSS 변수 필요

- [ ] **Tailwind Typography vs 인라인 스타일 충돌 정리**
  - Tiptap 출력에는 heading/link/list에 인라인 스타일이 포함되어 Tailwind Typography 스타일을 덮어씀
  - 공존 시 의도치 않은 이중 마진/패딩이 발생할 수 있음
  - 검토 필요 항목:
    - `prose-headings:font-bold` vs 인라인 `font-weight: 600` (공존 가능, 인라인 우선)
    - `prose-a:text-primary-600 prose-a:no-underline` vs 인라인 `color: #5e83fe; text-decoration: underline` (인라인 우선)
    - `prose-blockquote:border-primary-400` vs 인라인 `border-left: 3px solid #ddd` (인라인 우선)
  - **결론**: Tiptap HTML을 사용하는 새 포스트에서는 인라인 스타일이 우선 적용되므로 대부분 문제 없음. 단, 기존 Markdown 포스트와의 스타일 일관성이 깨질 수 있으므로 마이그레이션 계획 필요.

- [ ] **반응형 Typography (모바일 heading 크기)**
  - Tiptap heading 인라인 스타일이 고정 px 값 사용 (h2: 22px, h3: 20px 등)
  - 모바일 화면에서 너무 크거나 작을 수 있음
  - CSS `@media` 쿼리로 `[itemprop='articleBody'] h2` 등의 `font-size`를 오버라이드 (`!important` 필요)
  - 또는 에디터 측에서 인라인 스타일 대신 CSS 클래스 기반으로 전환하는 것을 검토 (장기)

### P2 (선택)

- [ ] **Underline 클래스 호환성**
  - Tiptap 출력: `<u class="underline">` -- Tailwind 환경에서 `.underline { text-decoration-line: underline; }` 자동 적용
  - Client Astro는 Tailwind 사용 중이므로 별도 작업 불필요
  - 단, Tailwind purge 대상에서 `underline` 클래스가 미사용으로 제거될 가능성 확인 필요 (HTML 콘텐츠는 빌드 타임 동적 생성이므로 Tailwind content 경로에 포함되지 않을 수 있음 -- `safelist`에 `underline` 추가 권장)

- [ ] **이미지 인라인 스타일 렌더링 (width % 기반)**
  - Tiptap 출력: `<img style="width: X%; height: auto;" src="..." />` -- Client 본문 컨테이너 너비 대비 동일 비율 렌더링
  - `[itemprop='articleBody'] img` 기본 스타일 (`max-width: 100%; height: auto;`) 확인 필요

- [ ] **리사이즈된 이미지의 반응형 대응**
  - 모바일에서 작은 퍼센트 이미지(`width: 30%` 등)가 너무 작아질 수 있음
  - CSS `@media` 쿼리로 모바일 최소 너비 설정 또는 `width: 100% !important` 오버라이드 검토

- [ ] **연속 이미지 갤러리 CSS snap 변환**
  - Tiptap 에디터에서 연속 `<img>` 삽입 시, Client에서 `scroll-snap-type: x mandatory` 갤러리로 자동 변환
  - 빌드 타임 또는 클라이언트 JS로 연속 `<img>` 감지 + 래퍼 `<div>` 생성
  - 갤러리 내 이미지 `width: X%` 인라인 스타일 오버라이드 필요 (`width: 100%`)

## Client: 가격 표시 포맷

- [x] PlaceInfoCard 가격: `price_prefix` + `price` (원 단위) 조합으로 표시 (구현 완료)
- [x] `price_min`/`price_max` → `price_prefix`/`price` 단일 필드로 변경 (구현 완료)

## DB 마이그레이션 (Supabase 콘솔 실행 필요)

> 아래 마이그레이션은 Admin/Client 코드와 `docs/database.md`에는 반영 완료되었으나, Supabase DB에 아직 실행하지 않은 항목.

- [ ] `posts` 테이블: `price_prefix` (text nullable), `price` (integer nullable) 컬럼 추가 + 기존 `price_min`, `price_max` 컬럼 삭제
- [ ] `post_translations` 테이블: `place_name` (text nullable), `address` (text nullable) 컬럼 추가

## SEO

- [ ] `Layout.astro`의 `TEMP_NOINDEX = true` → `false`로 변경하여 `index, follow` 복원 (실제 콘텐츠 준비 완료 후)
- [ ] GSC URL 검사 도구로 주요 페이지 재색인 요청 (noindex 해제 후 색인 가속)

## Media

- [ ] 이미지 여러 개일 때 가로 스크롤 (이미지 갤러리/캐러셀)
- [x] 이미지 클릭 시 확대 (Lightbox) — 전역 `ImageLightbox` 컴포넌트, Layout에 1회 삽입, scale 애니메이션
- [ ] 동영상 mp4 최적화 재생
- [ ] 이미지 최적화 — srcset/`<picture>`, Astro `<Image>` 컴포넌트 검토
- [ ] Google Embed Map 적용 (장소 정보 카드 연동)

## Media Upload

- [ ] 미디어 업로드 및 Pre-signed URL 로직 (Node.js/TypeScript)
  - `media-eunminlog` 버킷에 이미지를 안전하게 업로드하기 위한 로직 구현
  - **Server-side (Pre-signed URL 생성)**:
    - AWS SDK(v3)를 사용하여 클라이언트가 S3에 파일을 직접 업로드할 수 있는 임시 URL 생성
    - 파일 이름 중복 방지를 위한 랜덤 스트링(UUID 등) 처리
    - 허용할 파일 형식(jpg, png, webp 등) 유효성 검사
  - **Client-side (이미지 전송)**:
    - Pre-signed URL로 파일을 `PUT` 방식으로 전송하는 업로드 컴포넌트
  - **보안 고려사항**:
    - 모든 S3 버킷은 퍼블릭 액세스 차단, CloudFront OAC를 통해서만 접근 가능
    - `ACL` 설정 무시, 오직 정책(Policy) 기반으로 동작
  - 미디어 서버(`media.eunminlog.site`)는 Root Object 미설정 — 개별 파일 경로로 직접 접근

## i18n (다국어 조건부 처리)

### 장소명/주소 다국어 번역

> 상세 스펙: [`docs/place-i18n-specs.md`](place-i18n-specs.md)

- [ ] DB: post_translations에 place_name, address 컬럼 추가 (Supabase ALTER)
- [x] Client: PostTranslation, LocalizedPost 타입에 place_name, address / translated_place_name, translated_address 추가
- [x] Client: getLocalizedPost()에서 translated_place_name, translated_address 매핑
- [x] Client: mock 번역 데이터에 place_name, address 추가
- [x] Client: translations.ts에 place.* 번역 키 추가 (category, name, address, price, copyToast)
- [x] Client: PlaceInfoCard — 번역 표시, 장소명 복사 버튼 추가, 필드 라벨 다국어 처리, 복사 스크립트 변경, rating 제거, description(3줄 요약) 추가
- [x] Client: PostLayout — PlaceInfoCard에 translatedPlaceName, translatedAddress props 전달
- [x] Client: PostCard, SponsoredCard — translated_place_name 우선 표시
- [x] Client: search-data.ts — 번역 장소명으로 검색/추천 키워드
- [x] Client: feed JSON API — 번역 장소명 사용
- [ ] Admin: GPT-5 Nano 번역 파이프라인에 place_name, address 포함 (Phase 4+ 구현 시)

### 다국어 조건부 처리

- [ ] Admin: 포스트 작성/편집 폼에 "다국어 콘텐츠 제공" 토글 UI 추가 (기본값 `true`)
- [ ] Admin: `is_multilingual === false` 저장 시 GPT 번역 API 호출 스킵 로직
- [ ] DB: `posts` 테이블에 `is_multilingual` 컬럼 추가 (boolean, default `true`) — Supabase 마이그레이션
- [ ] DB: 기존 포스트 `is_multilingual = true` 일괄 설정 (데이터 마이그레이션)
- [ ] Client: LanguageSelector 비활성화 — `is_multilingual === false` 포스트에서 비한국어 locale 버튼 disabled 처리 (CSS-only 툴팁)
- [ ] Client: Locale 네비게이션 필터링 — multilingual 포스트 0개인 카테고리/서브카테고리를 다국어 페이지 사이드바/헤더에서 숨김
- [ ] Client: Locale 경로 조건부 생성 — multilingual 포스트 0개인 카테고리/서브카테고리의 locale 경로를 getStaticPaths에서 제외
- [ ] Client: 빈 피드 empty state — 카테고리/서브카테고리 인덱스에서 피드가 비어있을 때 "콘텐츠 준비 중" 메시지 표시
- [ ] Client: `/not-available/` 페이지 삭제 (LanguageSelector 비활성화로 대체)

## Ads

- [ ] 애드센스 광고 호출 스크립트 추가 (플레이스홀더 → 실제 광고 코드 교체)

## Analytics (GA4)

- [x] `shared/lib/analytics/gtag.ts` — gtag 타입 래퍼 생성 (스펙: [`docs/ga4-tracking.md`](ga4-tracking.md))
- [x] `window.gtag` 타입 선언 추가 (`env.d.ts`)
- [x] Enhanced Page View — `Layout.astro`에 `gaPageParams` prop 추가 + 각 페이지에서 전달
- [x] Post Card Click — `PostCard.astro`, `SponsoredCard.astro`에 data 속성 + 이벤트 위임
- [x] AdSense Tracking — 광고 컴포넌트 data 속성 + IntersectionObserver impression/view/click
- [x] 무한스크롤 동적 카드/광고 트래킹 연동
- [x] GA4 관리 콘솔 커스텀 디멘션 등록 (배포 후 데이터 수집 시작되면 등록)
  - 경로: GA4 관리 > 속성 설정 > 데이터 표시 > 맞춤 정의 > 맞춤 측정기준 만들기
  - | 측정기준 이름        | 범위   | 이벤트 매개변수        |
    | -------------------- | ------ | ---------------------- |
    | Page Type            | 이벤트 | `page_type`            |
    | Content Slug         | 이벤트 | `content_slug`         |
    | Content Category     | 이벤트 | `content_category`     |
    | Content Sub Category | 이벤트 | `content_sub_category` |
    | Content Locale       | 이벤트 | `content_locale`       |
    | Is Sponsored         | 이벤트 | `is_sponsored`         |
    | Search Term          | 이벤트 | `search_term`          |
    | Ad Slot              | 이벤트 | `ad_slot`              |
    | Ad Format            | 이벤트 | `ad_format`            |
    | Ad Position          | 이벤트 | `ad_position`          |
