# UI/UX Layout Specifications

## Brand

- **Project Name**: EUNMIN-LOG
- **Brand Name**: 은민로그 (eunmin log)
- **Language**: 한국어 기본, 다국어 지원 (GPT-5 Mini 번역): en, ja, zh-CN, zh-TW, id, vi, th

### Logo Text

- 한국어(`ko`): "은민로그" (`SITE_NAME_KO`)
- 다국어(나머지 locale): "eunminlog" (`SITE_NAME_EN`)
- 상수 위치: `packages/config/site.ts` (`SITE_NAME_KO`, `SITE_NAME_EN`)
- PC/Mobile 헤더 모두 동일 분기 적용: `locale === DEFAULT_LOCALE ? SITE_NAME_KO : SITE_NAME_EN`

### Color System

- **Primary**: Sage Green (`primary-50` ~ `primary-900`, base `#A6BAA1`)
- **Logo**: `primary-600` (`#6F8B68`), hover `primary-700`
- **추천 UI**: Primary 계열
- **별점**: Yellow (범용 컨벤션)

테마 토큰 정의: `packages/config/theme.css` | 상세 가이드: [`docs/theme.md`](theme.md)

### Image Style

- Client 앱 전체 `border-radius`가 테마 레벨에서 `0px` (`global.css`의 `@theme inline`).
- 별도의 `rounded-none` 클래스 불필요.
- 상세: [`docs/theme.md`](theme.md) Border Radius 섹션 참조.

## Categories

```
맛집 (delicious)
  ├── 한식
  ├── 양식
  ├── 일식
  └── 주점
카페 (cafe)
  ├── 핫플
  └── 카공
여행 (travel)
  ├── 국내
  ├── 해외
  └── 숙소
```

---

## PC Layout (Breakpoint: `lg` 이상)

**3-Column Layout**

```
[Header: Sticky Top]
+-----------------------------------------------------------------------------------------------+
|  [Logo: 은민로그]        맛집  |  카페  |  여행               [🌐 Language]  [🔍 Search]       |
+-----------------------------------------------------------------------------------------------+

[Body: 3-Column]
+-----------------------+-----------------------------------------------+-----------------------+
| [Left Sidebar: LNB]  | [Main Content: Feed List]                     | [Right Sidebar]       |
| (Fixed / Scrollable)  |                                               | (Sticky on Scroll)    |
|                       |  [Post Card 1] (LCP Priority Thumbnail)       |                       |
| 📂 Category Tree     |  [Post Card 2] (Lazy Load)                    |  📌 협찬 & Pick       |
| (모두 펼침)           |  [Post Card 3]                                |  [Sponsored Ad 1]     |
|                       |  ...                                          |  [Editor's Pick 1]    |
| ▾ 맛집               |                                               |                       |
|   한식 / 양식 / ...   |  [Pagination: Static JSON 페이지 자동 로드]    |                       |
| ▾ 카페               |                                               |                       |
|   핫플 / 카공         |                                               |                       |
| ▾ 여행               |                                               |                       |
|   국내 / 해외 / 숙소  |                                               |                       |
+-----------------------+-----------------------------------------------+-----------------------+

[Footer]
+-----------------------------------------------------------------------------------------------+
| Copyright © eunmin log | Privacy Policy | About (/about/)                                          |
+-----------------------------------------------------------------------------------------------+
```

### PC 핵심 규칙

- Left Sidebar: Category Tree 항상 전체 펼침
- Main: Card 형태 피드, IntersectionObserver 페이지네이션 (SSG 첫 페이지 + Static JSON fetch로 추가 로드)
- Right Sidebar: 협찬/광고 + Editor's Pick

---

## Mobile Layout (Breakpoint: `lg` 미만)

```
[Header: Sticky Top]
+-------------------------------------------------------+
| [Logo] |  맛집  카페  여행  (Snap Scroll →) | [🌐] [🔍] |
+-------------------------------------------------------+
```

### Mobile 핵심 규칙

1. **Header Navigation**
   - `scroll-snap-type: x mandatory` 수평 스크롤
   - 우측 끝 fade-out (`mask-image`) 처리로 스크롤 힌트
   - **햄버거 메뉴 금지, Drawer Sidebar 금지**

2. **In-Feed Ad Pattern**

   ```
   [Post Card 1]
   [Native In-feed Ad 1]  ← index 1
   [Post Card 2]
   [Post Card 3]
   [Post Card 4]
   [Native In-feed Ad 2]  ← index 4 (5번째 카드 직전)
   [Post Card 5]
   [Post Card 6]
   ...
   ```

   - 현재 `feed.first`, `feed.second`는 `enabled=false`로 Feed 슬롯 DOM, AdSense 요청, 쿠팡 fallback을 모두 생성하지 않는다.
   - `search.first`, `search.second`는 활성 상태로 검색 결과의 index 1, 4(2번째·5번째 카드 직전)에 광고를 삽입한다. 최소 250px을 예약하고 뷰포트 근접 시 AdSense를 요청하며 `unfilled`이면 식품·뷰티 쿠팡 다이나믹 위젯으로 전환한다.
   - Feed는 AdSense 실제 노출 확인 후 필요한 슬롯 키를 활성화하면 SSG와 추가 페이지의 같은 index에 광고를 삽입한다.
   - CSS `lg:hidden` / `hidden lg:block`으로 visibility 토글 (별도 HTML 구조 금지)

3. **피드 로딩**: IntersectionObserver 페이지네이션 (SSG 첫 페이지 + Static JSON fetch로 추가 로드)

4. **Footer (SEO Enhanced)**: Left Sidebar 대체 — 전체 서브카테고리 텍스트 링크 필수

---

## Component Specifications

### Shared Components

#### `PostCard.astro`

- **위치**: `features/post-feed/components/PostCard.astro`
- Thumbnail: 첫 번째 카드는 LCP Priority, 나머지는 Lazy Load
- Content: Category Badge, Title (`<h2>`), Description (line-clamp 2줄)
- Ad Variation: PostCard와 유사하되 "Sponsored" 라벨/배경으로 구분
- **반응형 크기 제한**: 모바일 `max-w-[718px] max-h-[404px]`, PC 제한 없음 (`lg:max-w-none lg:max-h-none`). SponsoredCard도 동일.

#### `PostCardGrid.astro`

- **위치**: `features/post-feed/components/PostCardGrid.astro`
- PostCard 목록을 그리드 형태로 렌더링한다. In-feed 활성화 시에만 index 1, 4(2번째·5번째 카드 직전)에 `InFeedAdsense`를 삽입한다.
- IntersectionObserver 페이지네이션 지원

#### `MobileHeader.astro`

- **위치**: `shared/components/layout/MobileHeader.astro`
- LanguageSelector + getActiveSegments 사용으로 중복 로직 제거

```css
.scroll-container {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  mask-image: linear-gradient(to right, black 85%, transparent 100%);
}
```

#### `PCHeader.astro`

- **위치**: `shared/components/layout/PCHeader.astro`
- LanguageSelector(`showLabel: true`) + getActiveSegments 사용으로 중복 로직 제거

#### `LanguageSelector.astro`

- **위치**: `shared/components/navigation/LanguageSelector.astro`
- `<details>/<summary>` 기반 언어 선택 드롭다운. PC/Mobile 헤더에서 공유.
- Props: `locale`, `path`, `showLabel?` (true이면 현재 locale 텍스트 + 화살표 아이콘 표시), `isMultilingual?`

**다국어 미지원 포스트 비활성화 동작** (`isMultilingual === false`):

- 비한국어 locale 버튼을 disabled 처리 (`<span>` 렌더링, 클릭 불가)
- CSS-only 툴팁으로 "이 글은 한국어만 지원합니다" 메시지 표시 (locale별 번역)
- 한국어(`ko`) 버튼은 항상 활성 상태 유지
- JavaScript 없음 -- 순수 HTML/CSS로 disabled 상태 + 툴팁 구현

#### `SubCategoryTabs.astro`

- **위치**: `shared/components/navigation/SubCategoryTabs.astro`
- **모바일 전용** (`block lg:hidden`) -- PC에서는 LeftSidebar가 서브카테고리 역할을 담당
- 카테고리/서브카테고리 인덱스 페이지 상단에 수평 서브카테고리 탭을 표시
- MobileHeader와 동일한 UI 패턴: 텍스트 링크 + `|` 구분선 + `mask-image` 우측 페이드 아웃
- Active 서브카테고리는 `text-primary-600`으로 하이라이트, 나머지는 `text-gray-700`
- 적용 페이지: `[category]/index`, `[category]/[sub_category]/index`, `[locale]/[category]/index`, `[locale]/[category]/[sub_category]/index`

```css
.sub-category-tabs {
  overflow-x: auto;
  mask-image: linear-gradient(to right, black calc(100% - 24px), transparent);
}
```

#### `CategoryTree.astro`

- **위치**: `shared/components/navigation/CategoryTree.astro`
- getActiveSegments 사용으로 활성 카테고리/서브카테고리 감지 로직 중복 제거

### Locale 네비게이션 필터링

다국어 페이지(`/{locale}/...`)에서 multilingual 포스트가 0개인 카테고리/서브카테고리를 네비게이션에서 숨긴다.

**적용 대상 컴포넌트**:

- CategoryTree (PC Left Sidebar) — 해당 카테고리/서브카테고리 항목 미렌더링
- PCHeader / MobileHeader — 해당 카테고리 탭 미렌더링
- SubCategoryTabs (Mobile) — 해당 서브카테고리 탭 미렌더링
- Footer — 해당 카테고리/서브카테고리 링크 미렌더링

**규칙**:

- 한국어(`ko`) 페이지에서는 필터링 없이 전체 카테고리/서브카테고리를 항상 표시
- 빈 피드 empty state: 카테고리/서브카테고리 인덱스 페이지에서 피드가 비어있을 때 "콘텐츠 준비 중" 메시지를 locale별 번역으로 표시

#### Header Search Button

- PC/Mobile 공통: 검색 버튼은 `/search/` 페이지로 이동하는 `<a>` 링크
- JavaScript 없음 -- 슬라이딩 애니메이션, JS ID 등 미사용
- PC/Mobile 헤더 모두 순수 HTML/CSS로 동작

#### `ThreeColumnLayout.astro`

- **위치**: `shared/components/layout/ThreeColumnLayout.astro`
- 3-column 그리드: 모바일 1컬럼, PC `[180px][1fr][300px]`
- Main 영역 패딩: 모바일 `pt-3 pb-6`, PC `py-6`
- 최대 너비: `max-w-screen-xl`, 수평 패딩: `px-4 lg:px-6`

#### `ImageLightbox.astro`

- **위치**: `shared/components/ui/ImageLightbox.astro`
- 전역 이미지 라이트박스. `Layout.astro`에 1회 삽입 (Toast와 동일 패턴)
- 게시글 본문(`[itemprop='articleBody'] img`) 이미지 클릭 시 풀스크린 확대
- 열기 애니메이션: `scale-75 opacity-0` -> `scale-100 opacity-100`, 배경 `bg-black/0` -> `bg-black/80`
- 닫기: X 버튼 / 바깥 클릭 / ESC 키 (역순 애니메이션 후 300ms 뒤 hidden)
- 본문 이미지에 `prose-img:cursor-pointer` 적용 (PostLayout CSS, 에디터 독립)
- 접근성: `role="dialog"`, `aria-modal="true"`, `aria-label`

#### `StarRating.astro`

- **위치**: `shared/components/ui/StarRating.astro`
- Props: `rating` (number)
- SVG 별 아이콘 5개 (filled + empty), 숫자 점수 표시
- Schema.org `Rating` 마이크로데이터 (`itemprop="reviewRating"`) 포함
- **현재 미사용**: PlaceInfoCard에서 평점 대신 3줄 요약으로 전환됨. 향후 rating UI 복원 시 재사용 가능

#### `SponsoredPostItem.astro`

- **위치**: `shared/components/layout/SponsoredPostItem.astro`
- Props: `post` (LocalizedPost), `currentSlug?`, `locale`
- `SponsoredPostList.astro`는 `title?`을 받아 우측/하단 인기글 섹션 제목을 표시. 미전달 시 `인기글` fallback.
- 인기글 섹션 제목은 페이지 범위에 맞춰 root/search는 `전체 인기글`, 대분류는 `{대분류} 인기글`, 소분류/상세는 `{소분류} 인기글`로 표시
- 현재 글과 slug 일치 시 `border-l-primary-500` active 스타일 적용
- 썸네일(80x80) + 제목(truncate) + 설명(line-clamp-2) 레이아웃
- 썸네일은 `optimizedUrl()`로 `_688.webp` 리사이즈본을 사용

### Feature Components: Post Detail (`features/post-detail/`)

#### `PlaceInfoCard.astro`

- **위치**: `features/post-detail/components/PlaceInfoCard.astro`
- Props: `categoryLabel`, `subCategoryLabel`, `placeName`, `translatedPlaceName?`, `address`, `translatedAddress?`, `pricePrefix?`, `translatedPricePrefix?`, `price`, `description`, `translatedDescription?`, `locale`
- Schema.org `LocalBusiness` 마이크로데이터 포함
- `border-radius` 없음 (`bg-gray-50 border border-gray-200 p-5 mb-6`)
- `<dl>` 기반 키-값 레이아웃 (`w-20` dt 라벨 폭): 카테고리, 장소, 주소, 가격대, 3줄 요약
- 필드 라벨은 `t()` 함수로 다국어 처리 (`place.category`, `place.name`, `place.address`, `place.price`, `post.summary`)
- 장소명: 번역 텍스트 표시, 외부 링크 아이콘으로 지도 검색 페이지 이동 (한국어: 네이버 지도 `map.naver.com/v5/search/{placeName}`, 다국어: 구글 지도 `google.com/maps/search/{placeName}`). 검색 정확도를 위해 원본 한국어 `placeName`으로 검색. i18n 키: `a11y.mapSearch`
- 주소: 번역 텍스트 표시, `data-copy` 속성으로 한글 원문 복사, `data-toast`로 다국어 페이지에서 토스트 알림 (`place.copyToast`)
- 가격 표시: `translatedPricePrefix` 우선, 없으면 `pricePrefix` 폴백. `place.currency` i18n으로 통화 단위 다국어 처리 (`원`/`won`/`ウォン`/`韩元` 등). 비한국어 locale에서 `place.targetCurrency`가 있으면 Google 환율 변환 링크 표시 (외부 링크 아이콘, `https://www.google.com/search?q={price}+KRW+to+{targetCurrency}`)
- 3줄 요약: `description` prop (`translatedDescription` 우선)을 개행 분할하여 `⋅` 접두사 리스트로 표시 (`post.summary` 라벨)
- 상세 스펙: [`docs/place-i18n-specs.md`](place-i18n-specs.md)

#### `ProductInfoCard.astro`

- **위치**: `features/post-detail/components/ProductInfoCard.astro`
- Props: `categoryLabel`, `subCategoryLabel`, `productNames` (`string[]`), `translatedProductNames?`, `purchaseSources` (`string[]`), `translatedPurchaseSources?`, `purchaseLinks` (`string[]`), `prices?` (`number[]`), `pricePrefixes?` (`string[]`), `translatedPricePrefixes?`, `description`, `isCoupangPartners`, `locale`
- Schema.org `Product` 마이크로데이터 포함
- `border-radius` 없음 (`bg-gray-50 border border-gray-200 p-5 mb-6`)
- `<dl>` 기반 키-값 레이아웃: 카테고리, 제품별(제품명/구매처/가격), 3줄 요약
- **제품 2개 이상**: PC 2열 그리드 (`grid-cols-1 lg:grid-cols-2`), `border-t border-b border-gray-200 py-3` 구분선
- **제품 1개**: 심플 레이아웃 (그리드/보더 없음)
- 제품명: `translatedProductNames` 우선 표시, `font-semibold`, `itemprop="name"`
- 구매처: 텍스트 + 구매 링크가 있으면 외부 링크 아이콘. `isCoupangPartners`이면 `rel="sponsored noopener noreferrer"`, 아니면 `rel="noopener noreferrer"`
- 가격 표시: `pricePrefix + price.toLocaleString() + '원'` 조합 (한국 원화 단위 명시)
- dt 라벨 폭: 제품 섹션 내부 `w-16` (64px), 카테고리/요약 `w-20` (80px)
- 필드 라벨 i18n: `place.category`, `product.name`, `product.source`, `place.price`, `post.summary`
- 3줄 요약: `description`을 개행 분할하여 `⋅` 접두사 리스트로 표시

#### 이미지 캐러셀

Admin에서 `data-type="image-carousel"`로 마크업된 연속 이미지를 Client에서 CSS snap 캐러셀로 변환하는 기능.

- **CSS 정의**: `global.css`의 `[data-type='image-carousel']` 셀렉터
- 뷰포트: `flex` + `overflow-x: auto` + `scroll-snap-type: x mandatory`, 스크롤바 숨김
- 슬라이드: `flex: 0 0 90%` + `scroll-snap-align: start`
- 화살표 (prev/next): `position: absolute` 중앙 정렬, 반투명 배경 + 흰색 아이콘
- **화살표 표시 전략 (반응형)**:
  - PC (`hover: hover`): 기본 숨김, 캐러셀 hover 시 `display: flex`로 표시
  - 모바일 (`hover: none`): 화살표 항상 표시 -- 첫 터치가 hover 상태 전환에 소비되어 라이트박스가 즉시 열리지 않는 문제를 방지하기 위함
  - `@media (hover: hover)` 미디어 쿼리로 분기

#### 링크 북마크 카드

본문 내 URL을 OG 태그 기반 카드 형태로 표시하는 기능.

**Admin (에디터)**:

- Tiptap 커스텀 노드 `CustomLinkBookmark` (`features/post-editor/configs/link-bookmark.ts`)
- HTML 출력: `<aside data-type="link-bookmark">` + `data-url`, `data-title`, `data-description`, `data-image`, `data-favicon` 속성
- 내부 구조: `<a>` 래퍼 안에 `<figure>` (이미지) + `<figcaption>` (제목/설명/도메인)
- URL 붙여넣기 시 `LinkPastePopup` 팝업으로 "링크" / "북마크 카드" 선택
- 파비콘 alt: `${title} 프로필 이미지` (i18n)
- 북마크 이미지는 ImageAltSheet에서 제외

**Client (렌더링)**:

- CSS: `global.css`에서 `[data-type='link-bookmark']` 스타일 정의
- hover 효과: `background-color: #f9fafb`
- 모바일 (`max-width: 640px`): `flex-direction: column` 세로 배치, figure `max-height: 200px`
- 내부 링크(`eunminlog.site`) 북마크: 빌드 타임에 다국어 URL/title/description 자동 변환 (`shared/lib/bookmark.ts` — `injectLocalizedBookmarks()`)
- 번역 파이프라인: 북마크 영역(`data-type="link-bookmark"`)은 번역 skip (`html-sections.ts`)

#### 협찬/쿠팡 파트너스 공시 배너

- **위치**: `PostLayout.astro` 내 썸네일과 PlaceInfoCard/ProductInfoCard 사이
- `is_sponsored` 또는 `is_coupang_partners`가 true일 때 조건부 렌더링
- 스타일: `bg-gray-50 border border-gray-200 p-5 mb-5 text-sm text-gray-500` (메타 박스와 동일 톤)
- 둘 다 true인 경우 박스 안에 두 줄로 표시 (`space-y-1`)
- 번역 키: `post.sponsoredDisclosure`, `post.coupangPartnersDisclosure` (8개 locale별)

#### AI 번역 안내 문구

- **위치**: `PostLayout.astro` 내 본문과 NearbyPostList 사이
- 한국어(`ko`) 이외 모든 다국어 게시글 하단에 표시
- 번역 키: `post.aiTranslated` (8개 locale별 번역 제공)
- 스타일: `text-sm text-gray-400 mt-6`

#### `NearbyPostList.astro`

- **위치**: `features/post-detail/components/NearbyPostList.astro`
- Props: `posts`, `currentSlug`, `categoryLabel`, `subCategoryLabel`, `moreLabel`, `subCategoryHref`, `locale`
- 같은 서브카테고리의 인근 포스트를 썸네일 + 제목 + 설명 리스트로 표시
- 현재 포스트는 `border-l-primary-500` + `aria-current="page"`로 구분
- 썸네일은 `optimizedUrl()`로 `_688.webp` 리사이즈본을 사용

#### `PostBadges.astro`

- **위치**: `features/post-detail/components/PostBadges.astro`
- Props: `isSponsored`, `isRecommended`, `sponsoredLabel`, `popularLabel`
- `is_sponsored`가 true이면 `협찬글`, 아니고 `is_recommended`가 true이면 `인기글` `PostBadge`를 렌더링
- `is_sponsored`와 `is_recommended`가 동시에 true이면 `협찬글`만 표시

### Feature Components: Search (`features/search/`)

#### `SearchUI.astro`

- **위치**: `features/search/components/SearchUI.astro`
- Props: `searchData`, `suggestedKeywords`, `placeholderText`, `noResultsText`, `noResultsHintText`, `resultsText`, `suggestedText`, `sponsoredLabel`
- 검색 폼, 추천 키워드 chip, 결과 리스트, 빈 결과 UI, 클라이언트 검색 스크립트를 하나의 컴포넌트로 통합
- `<script type="application/json">` 으로 검색 데이터 인라인 삽입
- 클라이언트 JS가 PostCard DOM을 동적으로 생성한다. In-feed 활성화 시에만 각 추가 페이지의 index 1, 4(2번째·5번째 카드 직전)에 광고를 삽입한다.

### Feature Components: Cookie Consent (`features/consent/`)

#### `CookieConsentBanner.astro`

- **위치**: `features/consent/components/CookieConsentBanner.astro`
- Props: `locale`
- `CONSENT_REQUIRED_LOCALES` (`en`, `ja`, `zh-CN`, `th`)에 해당하는 locale에서만 렌더링 (SSG 빌드 타임 결정)
- Sticky Footer Banner (`fixed bottom-0`, `z-40`), slide-up/slide-down 애니메이션
- 수락/거부 2-button (GDPR 요구사항: 동등한 시각적 비중)
- 수락: `cookie_consent=true` (365일), 거부: `cookie_consent=false` (1일)
- GA4 `cookie_consent` 이벤트 전송 (`action: accept/reject`, `content_locale`)
- `Layout.astro`에 삽입 (`Footer` 아래, `Toast`/`ImageLightbox` 위)
- 상세 스펙: [`docs/cookie-consent-specs.md`](cookie-consent-specs.md)

### Shared Components: Layout

#### `BloggerProfile.astro`

- **위치**: `shared/components/layout/BloggerProfile.astro`
- Props: `locale`
- LeftSidebar 하단에 프로필 표시
- `SITE_NAME_EN` 사용

### Shared Utilities

#### `formatDate(dateStr, locale)`

- **위치**: `shared/lib/date.ts`
- ISO 8601 날짜 문자열을 locale별 포맷(`year: numeric, month: long, day: numeric`)으로 변환
- 5곳의 중복 날짜 포맷 로직을 단일 함수로 통합

#### `getActiveSegments(pathname, locale)`

- **위치**: `shared/lib/navigation.ts`
- URL pathname에서 현재 활성 카테고리(`CategorySlug | null`)와 서브카테고리(`string | null`)를 추출
- PCHeader, MobileHeader, CategoryTree 3곳의 중복 로직을 단일 함수로 통합

#### `insertInArticleAds(html, advertisementLabel)`

- **위치**: `features/post-detail/lib/ads.ts`
- HTML 본문의 `<h2>` 섹션 경계에 Native In-article 광고 슬롯을 삽입
- 도입부·광고 사이·마지막 섹션의 문단 및 글자 수 guard를 통과한 후보만 삽입

#### `buildBlogPostingSchema(post, canonical)` / `buildReviewSchema(post)`

- **위치**: `features/post-detail/lib/schema.ts`
- JSON-LD 스키마 객체 생성 유틸리티. PostLayout에서 인라인으로 작성하던 로직을 분리.

#### `buildSearchData(posts, locale)`

- **위치**: `features/search/api/search-data.ts`
- LocalizedPost 배열을 검색용 JSON(`SearchItem[]`)과 추천 키워드(`string[]`)로 변환
- 검색 페이지의 데이터 준비 로직을 단일 함수로 통합

#### `wrapTablesWithScrollContainer(html)`

- **위치**: `shared/lib/image.ts`
- 게시글 본문 HTML에서 `div.tableWrapper`로 감싸지지 않은 `<table>`을 자동으로 래퍼로 감싼다
- Admin에서 `renderWrapper: true` 설정으로 저장된 HTML에는 이미 `div.tableWrapper`가 포함되어 있으므로 이중 래핑하지 않음
- `PostLayout.astro` 빌드 타임에 호출하여 기존 포스트 데이터도 일관되게 처리

**테이블 가로스크롤 처리 규칙:**

| 레이어        | 처리 방식                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------- |
| Admin         | Tiptap `Table.configure({ renderWrapper: true })`로 저장 HTML에 `div.tableWrapper` 포함      |
| Client (빌드) | `wrapTablesWithScrollContainer()`로 래퍼 미포함 테이블 처리                                  |
| CSS           | `.tableWrapper { overflow-x: auto }` + `td, th { min-width: 120px; vertical-align: middle }` |

---

## 광고 미디에이션 Specifications

| 배치                       | 사이즈 (Mobile) | 사이즈 (PC)        | 위치                                 | 컴포넌트                          |
| -------------------------- | --------------- | ------------------ | ------------------------------------ | --------------------------------- |
| PostLayout Fixed Adsense   | 300x50          | 468x60 (중앙 정렬) | 게시글 상세 본문 상단                | `FixedAdsense variant="post-top"` |
| RightSidebar Fixed Adsense | --              | 300x250            | PC 우측 사이드바 상단 (sticky)       | `FixedAdsense variant="sidebar"`  |
| Native In-Article          | fluid           | fluid              | 게시글 본문 중간 (H2 헤딩 앞에 삽입) | `insertInArticleAds()`            |
| Native In-feed             | fluid           | fluid              | Search index 1, 4 (Feed는 비활성)    | `InFeedAdsense`                   |

피드·검색용 Native In-feed unit(`6392269057`, layout key `-6t+ed+2i-1n-4w`)은 공유한다. Search 슬롯 키는 활성이고 Feed 슬롯 키는 비활성이다. 본문은 `article.first`, `article.second`가 Native In-article unit(`5322463062`, `fluid`, full-width responsive)을 공유한다. 활성 Native 지면은 `min-h-[250px]`만 예약하고 광고 높이 확장을 허용하며, Core Web Vitals 가드레일은 field p75 CLS 0.1 이하이다.

### Provider 선택과 CLS

- Local·Development에서는 활성 광고 지면에 Google Publisher Tag(GPT) 공식 공개 샘플을 표시한다. 현재 Article은 `/6355419/Travel` fluid, Search는 `/6355419/Travel` Native In-feed, Sidebar는 `/6355419/Travel/Europe/France/Paris` 300×250, PostTop은 `/6355419/Travel/Asia`와 현재 컨테이너 크기를 사용한다. 비활성 Feed는 GPT 슬롯도 만들지 않으며 Production에서는 GPT 분기를 사용하지 않는다.
- GPT가 정상 응답했지만 빈 슬롯이면 `GPT TEST AD · NO FILL`, SDK 로드·slot 정의·요청 실패면 `GPT TEST AD · LOAD FAILED`를 표시한다. 둘 다 provider `none`이며 Production에는 기술 marker를 표시하지 않는다.
- Production에서 운영 플래그가 꺼져 있으면 사이트 심사용 AdSense base tag만 로드하고 광고 단위 요청은 만들지 않는다. 지면별 고정 이미지 또는 다이나믹 iframe fallback만 표시한다.
- Production에서 운영 플래그가 켜져 있으면 AdSense의 `data-ad-status="unfilled"`에서만 해당 지면을 쿠팡으로 전환한다. `filled`와 `unfill-optimized`는 Google이 관리하는 AdSense 지면으로 유지한다.
- 다이나믹 iframe `src`는 쿠팡 전환 시점에만 설정하고 Local·Development 및 모바일의 숨겨진 Sidebar에서는 요청하지 않는다.
- 활성 상태의 ID 누락, 오류, 차단, 상태 미확인은 fallback 없이 예약 영역을 비워 둔다.
- 고정 Display 지면은 width/height를 유지하고, Native 지면은 `min-height: 250px`를 유지하면서 creative 높이 확장을 허용한다. 래퍼에 `overflow-hidden`을 두지 않아 광고나 AdChoices를 자르지 않는다.
- PostTop과 Sidebar는 `data-ad-format="auto"`를 사용하지 않는다. PostTop은 하나의 DOM 컨테이너에서 `lg` 미만이면 Mobile 고정 unit(`8174224200`, 300×50), `lg` 이상이면 PC 고정 unit(`1564849758`, 468×60) 하나만 선택해 요청한다. Sidebar는 PC 고정 unit(`3939731651`, 300×250)을 사용한다. 현재 컨테이너 크기를 광고 `<ins>` 인라인 픽셀 크기로 적용하고 같은 최소 높이를 예약해 AdSense 응답과 쿠팡 fallback 전환 중 CLS를 방지한다.
- 게시글 상단만 즉시 호출한다. 활성 Sidebar·Article은 뷰포트 300px 전부터 한 번만 호출한다.

### AdSense 컴포넌트

#### `FixedAdsense.astro`

- **위치**: `shared/components/ad/FixedAdsense.astro`
- Props: `variant` (`'post-top'` | `'sidebar'`)
- `post-top`: 모바일 300x50, PC 468x60 (반응형 전환)
- `sidebar`: 300x250 (PC 전용)

#### `InFeedAdsense.astro`

- **위치**: `shared/components/ad/InFeedAdsense.astro`
- Props: `slotKey`, `slotId`, `position`, `fallbackIndex`, `locale`
- 현재 Feed에서는 비활성 슬롯 키에 해당하는 컴포넌트를 렌더링하지 않는다. Search는 활성 슬롯 키에 `w-full min-h-[250px]`로 최소 공간을 예약하고 Native creative의 가변 높이를 허용한다.
- provider가 활성화될 때만 `role="complementary"`와 광고 접근성 라벨을 적용한다.
- 운영 AdSense unit ID(`6392269057`)는 Feed/Search의 반복 DOM 슬롯에서 재사용한다. `data-ad-slot`과 `data-ad-position`은 각 노출의 논리 슬롯·위치를 고유하게 식별한다.

### In-Article Adsense 삽입 규칙

- HTML `<h2>` 헤딩 기준으로 섹션 분할
- 광고 예약 영역의 상하 여백은 각각 40px
- 첫 광고: 도입부에 `<p>` 2개 이상 또는 텍스트 300자 이상일 때 첫 H2 앞에 삽입
- 두 번째 광고: 두 후보 사이 600자 이상이며 마지막 H2 이후 300자 이상일 때 마지막 H2 앞에 삽입
- 조건을 충족하지 않는 후보는 생략하고, 삽입된 슬롯은 같은 In-article unit을 재사용한다.
- 삽입 로직: `features/post-detail/lib/ads.ts` -- `insertInArticleAds()`

---

## Search Page

**라우팅**: `/search/` (한국어), `/{locale}/search/` (다국어)

**레이아웃**: ListLayout (3-Column -- LeftSidebar + Main + RightSidebar)

**구현 컴포넌트**: `SearchUI.astro` (features/search/components/) + `buildSearchData()` (features/search/api/)

### 구성 요소

1. **검색 입력**: 돋보기 아이콘(좌측) + `<input type="search">`. Enter(form submit)로 검색 실행, 실시간 필터링 아님.
2. **추천 키워드**: place_name + 카테고리 라벨을 빌드 타임에 추출. 클릭 가능한 chip 형태.
3. **검색 결과**: 결과 건수 표시 + PostCard 리스트. 현재 Native In-feed는 비활성이고 승인 후 result index 1, 4에 삽입.
4. **결과 없음**: 아이콘 + 안내 메시지 + 힌트 텍스트
5. **URL**: `history.replaceState`로 `?q=` 파라미터 반영 (페이지 새로고침 없음)

### 데이터 전략

- `buildSearchData(posts, locale)`가 빌드 타임에 전체 포스트를 `SearchItem[]`과 추천 키워드로 변환
- `SearchUI.astro`가 JSON을 `<script type="application/json">`에 인라인 삽입
- 클라이언트 JS가 title, description, place_name 기준으로 필터링

---

## Responsive Strategy

| 요소          | PC (`lg:` 이상)   | Mobile (`lg:` 미만)          |
| ------------- | ----------------- | ---------------------------- |
| Left Sidebar  | `hidden lg:block` | 숨김 (Footer로 대체)         |
| Right Sidebar | `hidden lg:block` | In-Feed Ad로 전환            |
| Header Nav    | 텍스트 메뉴       | Snap Scroll                  |
| Ad 배치       | Right Sidebar     | 현재 없음(In-feed 승인 대기) |
| Footer Links  | 기본              | Full Sitemap (SEO)           |
