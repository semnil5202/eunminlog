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
   - `search.first`, `search.second`는 활성 상태로 검색 결과의 index 1, 6, 11, 16…(2·7·12·17번째 카드 직전)에 광고를 삽입한다. 최소 250px을 예약하고 뷰포트 근접 시 AdSense를 요청하며 `unfilled`이면 식품·뷰티 쿠팡 다이나믹 위젯으로 전환한다.
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
- PostCard 목록을 그리드 형태로 렌더링한다. In-feed 활성화 시에만 index 1, 6, 11, 16…(2·7·12·17번째 카드 직전)에 `InFeedAdsense`를 삽입한다.
- 최초 SSG와 추가 JSON 페이지는 언어·카테고리에 관계없이 게시글 10개 단위다. 광고는 게시글 수에서 제외하며 전체 게시글 인덱스로 계산한다. 두 슬롯 키와 쿠팡 fallback을 번갈아 사용하고 Feed 슬롯 두 개 모두 활성화한다. 검색은 페이지네이션 없이 필터링된 전체 결과에 같은 간격을 적용한다.
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
- PC 우측 사이드바는 인기글이 3개 이상일 때 두 번째 글 뒤에 Native In-feed를 삽입한다. 모바일 하단 재사용 목록에는 삽입하지 않는다.
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
- Props: `categoryLabel`, `subCategoryLabel`, `productNames` (`string[]`), `translatedProductNames?`, `purchaseSources` (`string[]`), `translatedPurchaseSources?`, `purchaseLinks` (`string[]`), `prices?` (`number[]`), `pricePrefixes?` (`string[]`), `translatedPricePrefixes?`, `description`, `isPaidPlacement`, `locale`
- Schema.org `Product` 마이크로데이터 포함
- `border-radius` 없음 (`bg-gray-50 border border-gray-200 p-5 mb-6`)
- `<dl>` 기반 키-값 레이아웃: 카테고리, 제품별(제품명/구매처/가격), 3줄 요약
- **제품 2개 이상**: PC 2열 그리드 (`grid-cols-1 lg:grid-cols-2`), `border-t border-b border-gray-200 py-3` 구분선
- **제품 1개**: 심플 레이아웃 (그리드/보더 없음)
- 제품명: `translatedProductNames` 우선 표시, `font-semibold`, `itemprop="name"`
- 구매처: 텍스트 + 구매 링크가 있으면 외부 링크 아이콘. 협찬 또는 쿠팡 파트너스 글이면 `rel="sponsored noopener noreferrer"`, 아니면 `rel="noopener noreferrer"`
- 가격 표시: `pricePrefix + price.toLocaleString() + '원'` 조합 (한국 원화 단위 명시)
- dt 라벨 폭: 제품 섹션 내부 `w-16` (64px), 카테고리/요약 `w-20` (80px)
- 필드 라벨 i18n: `place.category`, `product.name`, `product.source`, `place.price`, `post.summary`
- 3줄 요약: `description`을 개행 분할하여 `⋅` 접두사 리스트로 표시

#### Admin 이미지 설명 (alt)

- 단일·캐러셀 사진 클릭 시 해당 alt 입력란으로 스크롤 없이 포커스를 이동한다. 텍스트 입력·붙여넣기가 선택된 이미지 노드를 교체하지 않도록 설명 입력으로 전달하며 리사이즈·스와이프·편집 버튼 조작은 자동 포커스 대상에서 제외한다.
- 썸네일과 본문 alt 입력 영역은 공통 스타일로 1px 테두리·옅은 배경·16px 안쪽 여백으로 묶고 제목을 강조한다. 입력 중에는 영역 테두리를 파란색으로 표시한다. 썸네일은 글 작성·수정 화면 모두 동일하게 적용한다.
- 썸네일 바로 아래에는 설명 입력란을 항상 표시한다. 본문의 단일 이미지·캐러셀 사진은 선택했을 때만 해당 사진 하단에 입력란을 표시하며 기존 편집 버튼을 유지한다. 캐러셀 하단의 별도 이미지 번호 영역은 표시하지 않는다. 설명 입력란은 사진 크기 조절 점선 밖에 두고 모자이크 편집 중에는 숨긴다.
- 하단 `이미지 alt 입력` 드로어 버튼을 유지한다. 인라인 입력과 드로어는 기존 본문 `imageAlts`·썸네일 `thumbnailAlt`를 입력 즉시 공유하며 별도 저장 버튼을 추가하지 않는다. 동일 URL은 같은 설명을 사용하고 드로어 목록에서는 중복 제거한다.
- 드로어가 열린 상태도 자동·수동 임시저장 대상이다. 입력할 때마다 서버를 호출하지 않고 기존 2분 저장 주기를 유지한다. 입력란 포커스·한글 조합을 보존하며 저장 HTML·공개 화면에 편집용 입력란은 포함하지 않는다.

#### Admin 이미지 모자이크

하단 취소 버튼은 ghost 스타일에 1px `border-input` 테두리를 표시한다.

처음 생성하는 모자이크는 원본 이미지의 짧은 변 9%를 한 변으로 하는 정사각형이다. 기존 18% 대비 가로·세로를 각각 절반으로 줄이며 이후 사용자가 조절한 영역 크기를 재사용하는 동작은 유지한다.

모자이크 영역의 네 모서리 핸들은 10×10px 정사각형과 1px 흰 테두리로 표시한다. 작은 영역을 가리지 않도록 기존 20×20px에서 축소하며 영역 테두리 모서리에 중심을 맞춘다.

- 업로드 입구는 추가하지 않는다. 단일 이미지 선택 후 `모자이크`, 캐러셀은 이미지별 `모자이크` 버튼으로 같은 확대 모달에 진입한다. 화면 대부분을 사용하며 모바일은 전체 화면으로 표시한다. 본문 크기·cover 크롭과 분리하여 원본 사진 전체를 비율 유지(contain)로 표시한다.
- 사진 클릭/탭으로 고정 강도 사각 모자이크를 생성한다. 영역 이동·모서리 크기 조절·다중 영역·삭제 및 적용/취소를 제공하며 편집 중 원래 이미지 리사이즈와 캐러셀 스와이프를 잠근다. 영역 되돌리기 기능은 제공하지 않는다.
- 모달 하단은 안내 줄과 버튼 줄을 분리하고 사진 영역과 별개로 항상 표시한다. `영역 추가·영역 삭제` 그룹과 우측 `취소·적용` 그룹을 여유 있게 배치하고 좁은 화면에서는 줄바꿈한다. 44px 버튼, 그룹 내 8~12px 간격, 그룹 간 가로 32px·세로 16px 간격을 사용하며 적용은 primary로 강조한다. 포커스를 모달 안에 유지하고 바깥 클릭으로는 닫지 않으며 Escape·취소는 변경 없이 닫는다.
- 영역 좌표는 모달 표시 크기에서 원본 기준으로 변환하여 저장 전까지만 관리한다. 적용 시 이미지 픽셀에 반영된 원본용/688px 파일을 새로 만들며 원본 URL 파일은 삭제하지 않는다. 본문 Undo/Redo 및 기존 크기·크롭·순서·대체 텍스트를 보존한다.

Admin 본문 외곽 패딩·하단 빈 공간에는 글 끝으로 이동시키는 클릭 처리를 두지 않는다. 본문 내부 클릭·선택은 기본 에디터 동작을 유지한다.

#### Admin 표 설정 바

Admin의 표 설정 바는 기본 편집 툴바 바로 아래에 위치한다. 문서·중첩 영역의 양방향 스크롤과 화면 크기 변경 시 기본 툴바의 실제 하단을 추적하여 sticky 전환 전후에도 분리되지 않는다.

#### 이미지 캐러셀

Admin에서 명시적으로 생성한 `data-type="image-carousel"` 블록을 Client에서 CSS snap 캐러셀로 표시하는 기능. 일반 이미지가 연속되어도 자동으로 묶지 않는다.

일반 이미지 버튼은 선택 즉시 업로드하며 확인 모달을 생략한다. 진행·완료·오류는 Sonner 토스트로 표시하고 진행 중 취소를 제공한다. 일반 이미지와 캐러셀 생성·추가 모두 실패 시 알림만 남기고 선택 목록·대기 큐·세션을 즉시 해제하여 새 파일을 받을 수 있게 한다. 캐러셀은 미리보기 모달을 유지하되 실패하면 닫으며 재시도 버튼은 제공하지 않는다. 기존 본문은 보존하고 다시 진행하려면 파일을 새로 선택한다. 모든 경로의 용량 제한은 파일당 50MB이며 여러 파일 합산 제한은 없다.

Admin 본문 WYSIWYG는 클립보드 이미지 파일 붙여넣기와 외부 파일 드롭도 동일한 즉시 업로드로 처리한다. 붙여넣기는 커서 위치, 드롭은 놓은 위치를 추적하며 여러 장도 독립 이미지로 삽입한다. 파일 드래그 중에는 본문 영역 강조·안내를 표시하고 이탈·종료 시 해제한다. 일반 텍스트/URL 붙여넣기와 내부 이미지 이동은 유지하며 파일+텍스트 혼합 클립보드는 파일을 우선한다. HTML 모드·썸네일·캐러셀 모달은 이미지 붙여넣기/드롭 업로드 대상이 아니다.

- **작성 정책**: Admin 툴바에서 2장 이상으로 생성하고, 해당 캐러셀의 `이미지 추가`로 끝에 추가한다. 삭제 후 1장이 남아도 캐러셀을 유지하고 마지막 이미지 삭제 시 블록을 제거한다.
- **업로드 완료 화면 유지**: 업로드 완료를 이유로 커서·포커스·스크롤을 삽입 위치로 이동시키지 않는다. 툴바 파일 선택 후 시작 시점과 캐러셀 모달 종료 시점에만 필요한 본문 포커스를 스크롤 없이 복원한다. 다른 입력란의 포커스는 유지하며 별도 임시 이미지나 대기 큐 UI는 추가하지 않는다.
- **툴바 표시**: 사진과 하단 좌우 화살표를 결합한 아이콘만 표시하며, 툴팁·접근 가능한 이름은 `캐러셀 만들기`다. 캐러셀·표 아이콘은 18px 크기, 24×24 viewBox, strokeWidth 1.75로 시각적 무게를 맞춘다.
- **Admin 편집 경계**: 캐러셀 전체 테두리와 상단 `캐러셀 · N장`/`이미지 추가`로 전체 조작을 구분한다. 하단 `N번 이미지` 영역은 제거하고 사진 클릭/탭·Enter/Space로 선택하면 좌측 상단에 `모자이크·삭제`를 표시한다. 단일 이미지는 모자이크만 유지한다. 리사이즈는 단일 이미지와 공통 파란 점선·원형 핸들 CSS를 사용하며 이 관리 UI는 저장 HTML·공개 뷰어에 노출하지 않는다.
- **캐러셀 크기 맞춤**: 드래그 중 바로 앞·뒤 사진의 실제 너비/높이에 축별로 8px 이내 진입·14px 초과 이탈하는 스냅을 제공한다. 최소/최대 제한을 우선하며 옆 사진은 바꾸지 않는다. 안내 문구 없이 높이가 맞으면 실제 사진 하단에 캐러셀 전체 너비의 파란 실선을 표시한다. 너비 실선은 사진 우측 끝에 표시하며 크기 조절 점선과 분리한다. 실선은 스냅 중에만 표시한다.
- **선택선 가시성**: 사진과 점선 사이 6px 배경 여백, 캐러셀 편집 뷰포트 내부 16px 여백·슬라이드 사이 32px를 확보한다. 핸들은 사진 위가 아닌 점선 모서리에 배치한다. 공개 캐러셀의 간격은 변경하지 않는다.
- 단일 이미지 편집용 내부 이미지에는 margin을 두지 않고, 본문과의 상하 12px 간격은 NodeView 컨테이너에 적용하여 선택선 간격을 사방 동일하게 유지한다.
- **Admin 선택 모달**: 빈 상태의 큰 `이미지 선택` 영역에서 파일 선택창을 연다. 선택 후 장수·순서 번호·미리보기·제거와 `이미지 더 선택`을 제공하고 부족한 장수를 안내한다. 모달 높이는 최대 `90dvh`, 본문 목록만 스크롤하여 하단 실행 버튼을 유지한다. 주요 조작 버튼은 44px 이상이며 외부 드래그앤드롭은 이번 범위에 포함하지 않는다.
- **호환 계약 (P0)**: 기존 블록의 직계 `<img>`와 `src`, `data-width`, `data-height`, 실제 `width`/`height`를 유지한다. `auto`, 기존 px 높이, `ratio:` 크롭을 모두 읽는다. 이미지 URL 최적화·원본 라이트박스·src 기반 대체 텍스트 연결도 유지한다.

- **CSS 정의**: `global.css`의 `[data-type='image-carousel']` 셀렉터
- 뷰포트: `flex` + `overflow-x: auto` + `scroll-snap-type: x mandatory`, 스크롤바 숨김
- 슬라이드: 기본 `flex: 0 0 90%` + `scroll-snap-align: start`. 저장된 `data-width`와 `data-height`에 따라 개별 너비와 크롭 비율을 반영한다.
- 화살표 (prev/next): `position: absolute` 중앙 정렬, 반투명 배경 + 흰색 아이콘
- Admin과 Client 모두 실제 스크롤 범위 안의 서로 다른 슬라이드 정지점으로 이동하며, 시작·끝에서는 해당 방향 버튼을 비활성화한다. 좁은 슬라이드 여러 장이 동시에 보이는 경우에도 버튼이 같은 위치에서 정체되지 않는다.
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
- 최대 4개를 이전 글·현재 글·다음 글·다다음 글 순서로 구성한다. 경계에서는 존재하는 글만 표시한다.
- 글이 3개 이상일 때만 두 번째 글 뒤에 Native In-feed를 삽입한다. 1~2개면 광고 DOM과 예약 공간을 만들지 않는다.
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
- 클라이언트 JS가 PostCard DOM을 동적으로 생성한다. In-feed 활성화 시에만 누적 게시글 기준 index 1, 6, 11, 16…(2·7·12·17번째 카드 직전)에 광고를 삽입한다.

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
- 리스트·협찬 카드·무한스크롤 JSON·검색·상세 모두 공통 함수를 사용하고 시간대를 `Asia/Seoul`로 고정한다. 빌드 환경·방문자 시간대와 무관하게 같은 KST 날짜를 표시한다.
- 언어에 따라 날짜 표기만 달라지며 달력은 locale 기본값을 유지한다. 태국어는 불기를 사용한다(서기 2026년 → 불기 2569년).

#### `getActiveSegments(pathname, locale)`

- **위치**: `shared/lib/navigation.ts`
- URL pathname에서 현재 활성 카테고리(`CategorySlug | null`)와 서브카테고리(`string | null`)를 추출
- PCHeader, MobileHeader, CategoryTree 3곳의 중복 로직을 단일 함수로 통합

#### `insertInArticleAds(html, advertisementLabel)`

- **위치**: `features/post-detail/lib/ads.ts`
- HTML 본문의 `<h2>` 섹션 경계에 Native In-article 광고 슬롯을 삽입
- 직전 섹션의 표시 텍스트가 250자 이상이거나 이미지가 1개 이상인 후보를 앞에서부터 최대 10개 삽입
- 적격 위치 계산·슬롯 활성 상태·예약 높이(최소 250px)·상하 여백(각 40px)은 `packages/config/article-ads.ts`를 Admin과 Client가 공유한다. 기존 배치 조건은 변경하지 않는다.
- Admin 본문에는 동일한 적격 H2 앞에 `in article adsense`를 가로·세로 중앙 정렬한 미리보기를 표시한다. `#` + 공백도 H2로 변환되며, 조건을 충족하지 않는 제목 앞에는 표시하지 않는다.
- 미리보기는 편집기 Decoration으로만 표시한다. 클릭·포커스·수정·삭제 대상이 아니며 HTML/JSON·임시저장·번역에는 포함하지 않는다. 본문 변경과 Undo/Redo에 따라 갱신하고 광고 네트워크를 호출하지 않는다.

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

| 배치                       | 사이즈 (Mobile) | 사이즈 (PC)         | 위치                                         | 컴포넌트                          |
| -------------------------- | --------------- | ------------------- | -------------------------------------------- | --------------------------------- |
| PostLayout Fixed Adsense   | 300x50          | 468x60 (중앙 정렬)  | 게시글 대표 이미지·공시문 아래, 정보 카드 위 | `FixedAdsense variant="post-top"` |
| RightSidebar Fixed Adsense | --              | 300x250             | PC 우측 사이드바 상단 (sticky)               | `FixedAdsense variant="sidebar"`  |
| 인기글 Native In-feed      | 높이 150px              | fluid (300x150 고정) | PC 우측·모바일 하단 인기글 두 번째 글 뒤, 글 3개 이상       | `InFeedAdsense`                   |
| 인근 글 Native In-feed     | 높이 150px           | 높이 150px               | 상세 하단 인근 글 두 번째 글 뒤, 글 3개 이상 | `InFeedAdsense`                   |
| Native In-Article          | fluid           | fluid               | 게시글 본문 중간 (H2 헤딩 앞에 삽입)         | `insertInArticleAds()`            |
| Native In-feed             | fluid           | fluid               | Feed·Search index 1, 6, 11, 16…            | `InFeedAdsense`                   |

피드·검색·인기글·인근 글 Native In-feed unit(`6392269057`, layout key `-6t+ed+2i-1n-4w`)은 공유한다. Feed·Search·인기글·인근 글 슬롯 키는 모두 활성이다. 본문은 `article.1`부터 `article.10`까지 같은 Native In-article unit(`5322463062`, `fluid`, full-width responsive)을 공유한다. 인기글·인근 글은 150px 고정 높이를 사용하며, Feed·Search는 높이 420px, In-article은 `min-h-[250px]`를 예약하고 광고 높이 확장을 허용하며, Core Web Vitals 가드레일은 field p75 CLS 0.1 이하이다.

### Provider 선택과 CLS

- 인기글은 PC 우측과 `lg` 미만 게시글 하단에서 각각 사용하며, 글이 3개 이상일 때 두 번째 글 뒤에 삽입한다. 두 DOM의 추적 ID는 구분한다. 인근 글도 150px을 예약하고 AdSense `<ins>`에 높이 150px을 지정한다. 홈·검색은 420px 예약·요청 높이를 사용한다.
- lazy observer 및 AdSense 큐 처리 직전에 실제 폭·레이아웃 박스를 확인하여 CSS로 숨겨진 지면은 요청하지 않는다. 큐 대기 중 숨겨진 지면은 요청 표시를 해제하고 다시 관찰한다. 광고를 `overflow:hidden`으로 자르지 않는다.

- Local·Development에서는 활성 광고 지면에 Google Publisher Tag(GPT) 공식 공개 샘플을 표시한다. 현재 Article은 `/6355419/Travel` fluid, Search는 `/6355419/Travel` Native In-feed, Sidebar는 `/6355419/Travel/Europe/France/Paris` 300×250, PostTop은 `/6355419/Travel/Asia`와 현재 컨테이너 크기를 사용한다. Feed도 GPT 샘플을 표시하며 Production에서는 GPT 분기를 사용하지 않는다.
- GPT가 정상 응답했지만 빈 슬롯이면 `GPT TEST AD · NO FILL`, SDK 로드·slot 정의·요청 실패면 `GPT TEST AD · LOAD FAILED`를 표시한다. 둘 다 provider `none`이며 Production에는 기술 marker를 표시하지 않는다.
- Production에서 운영 플래그가 꺼져 있으면 사이트 심사용 AdSense base tag만 로드하고 광고 단위 요청은 만들지 않는다. 지면별 고정 이미지 또는 다이나믹 iframe fallback만 표시한다.
- Production에서 운영 플래그가 켜져 있으면 AdSense의 `data-ad-status="unfilled"`에서만 해당 지면을 쿠팡으로 전환한다. `filled`와 `unfill-optimized`는 Google이 관리하는 AdSense 지면으로 유지한다.
- 다이나믹 iframe `src`는 쿠팡 전환 시점에만 설정한다. Article은 화면 폭과 무관하게 홀수 순번에 680×140, 짝수 순번에 300×250 위젯을 사용한다. Search와 Feed는 화면 폭 분기 없이 In-feed 전용 680×280 위젯을 사용한다. 인기글은 300×100, 인근 글은 680×140을 중앙 정렬하며 Sidebar는 300×250을 유지한다. Local·Development 및 모바일의 숨겨진 Sidebar에서는 요청하지 않는다.
- 활성 상태의 ID 누락, 오류, 차단, 상태 미확인은 fallback 없이 예약 영역을 비워 둔다.
- 고정 Display 지면은 width/height를 유지하고, In-article 지면은 최소 높이를 유지하면서 AdSense creative 높이 확장을 허용한다. PC 쿠팡 fallback이 680×140이어도 예약 높이는 줄이지 않으며 래퍼에 `overflow-hidden`을 두지 않아 광고나 AdChoices를 자르지 않는다.
- PostTop과 Sidebar는 `data-ad-format="auto"`를 사용하지 않는다. PostTop은 하나의 DOM 컨테이너에서 `lg` 미만이면 Mobile 고정 unit(`8174224200`, 300×50), `lg` 이상이면 PC 고정 unit(`1564849758`, 468×60) 하나만 선택해 요청한다. Sidebar는 PC 고정 unit(`3939731651`, 300×250)을 사용한다. 현재 컨테이너 크기를 광고 `<ins>` 인라인 픽셀 크기로 적용하고 같은 최소 높이를 예약해 AdSense 응답과 쿠팡 fallback 전환 중 CLS를 방지한다.
- PostTop 쿠팡 fallback은 로켓 반려동물용품 고정 배너(`1013691`, 원본 728×90)를 사용한다. Mobile 300×50·PC 468×60 예약 컨테이너 안에서 원본 비율을 보존해 축소하고 중앙 정렬하며 AdSense unit 크기는 변경하지 않는다.
- 게시글 상단만 즉시 호출한다. 활성 Sidebar·Article·인기글·인근 글은 뷰포트 300px 전부터 한 번만 호출한다.
- AdSense `<ins>`는 실제 호출 시점에만 대상 컨테이너에 생성한다. 공통 요청 큐가 `data-adsbygoogle-status` 접수를 확인한 뒤 다음 슬롯을 처리해 여러 lazy 지면의 전역 `push({})` 호출이 DOM상 다른 광고 단위에 연결되지 않게 한다.

### AdSense 컴포넌트

#### `FixedAdsense.astro`

- **위치**: `shared/components/ad/FixedAdsense.astro`
- Props: `variant` (`'post-top'` | `'sidebar'`)
- `post-top`: 게시글 대표 이미지와 협찬·쿠팡 공시문 아래, 장소·제품 정보 카드 위에 배치한다. 모바일 300x50, PC 468x60을 `lg` 경계에서 전환한다.
- `sidebar`: 300x250 (PC 전용)

#### `InFeedAdsense.astro`

- **위치**: `shared/components/ad/InFeedAdsense.astro`
- Props: `slotKey`, `slotId`, `position`, `fallbackIndex`, `locale`
- Feed와 Search는 활성 슬롯 키에 `w-full h-[420px] min-h-[280px] max-h-[420px]`을 적용하고 AdSense `<ins>`에도 높이 420px을 지정한다. PC·모바일 및 모든 언어의 초기 SSG·추가 로딩·검색 결과에 공통 적용한다. 최소 280px은 하한이며 실제 공간은 CLS 방지를 위해 420px로 유지한다. 쿠팡 680×280은 중앙 정렬하고 광고를 잘라내지 않는다. 운영 creative 적합성은 배포 후 별도 확인한다.
- provider가 활성화될 때만 `role="complementary"`와 광고 접근성 라벨을 적용한다.
- 운영 AdSense unit ID(`6392269057`)는 Feed/Search의 반복 DOM 슬롯에서 재사용한다. `data-ad-slot`과 `data-ad-position`은 각 노출의 논리 슬롯·위치를 고유하게 식별한다.

### In-Article Adsense 삽입 규칙

- HTML `<h2>` 헤딩 기준으로 섹션 분할
- 광고 예약 영역의 상하 여백은 각각 40px
- 각 H2의 직전 섹션에서 태그·HTML 속성·이미지 `alt`를 제외한 표시 텍스트가 250자 이상이거나 `<img>`가 1개 이상이면 해당 H2 앞에 삽입
- 연속 H2처럼 직전 섹션이 비어 있으면 생략하고, 적격 후보를 문서 순서대로 최대 10개까지만 삽입
- `article.1`부터 `article.10`까지 같은 In-article unit을 재사용하며, 쿠팡 fallback은 같은 순번의 위젯을 1:1로 사용한다.
- 쿠팡 fallback 크기는 AdSense 설정과 독립적이다. AdSense는 Mobile·PC 모두 `fluid` In-article을 유지하고, 쿠팡은 두 화면 모두 홀수 순번 5개에 680×140·짝수 순번 5개에 300×250을 교차 배치한다.
- 쿠팡 Article 1·4와 Sidebar는 각각 별도 고객 관심 기반 추천 위젯을 사용하고 나머지는 카테고리 베스트를 사용해 위치별 성과를 비교한다.
- 삽입 로직: `features/post-detail/lib/ads.ts` -- `insertInArticleAds()`

---

## Search Page

**라우팅**: `/search/` (한국어), `/{locale}/search/` (다국어)

**레이아웃**: ListLayout (3-Column -- LeftSidebar + Main + RightSidebar)

**구현 컴포넌트**: `SearchUI.astro` (features/search/components/) + `buildSearchData()` (features/search/api/)

### 구성 요소

1. **검색 입력**: 돋보기 아이콘(좌측) + `<input type="search">`. Enter(form submit)로 검색 실행, 실시간 필터링 아님.
2. **추천 키워드**: place_name + 카테고리 라벨을 빌드 타임에 추출. 클릭 가능한 chip 형태.
3. **검색 결과**: 결과 건수 표시 + PostCard 리스트. Native In-feed를 result index 1, 6, 11, 16…에 삽입하며 `unfilled`일 때 반응형 쿠팡 다이나믹 위젯으로 전환.
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
| Ad 배치       | Right Sidebar     | Feed 5개 간격 |
| Footer Links  | 기본              | Full Sitemap (SEO)           |

인피드 컨테이너는 우측 인기글 최소 104px·최대 150px, 게시글 하단 인근 글과 모바일 인기글 최소 112px·최대 150px이다. 구분선 1px은 광고 높이와 별도이다. 세 영역 모두 CLS 방지를 위해 실제 높이 150px을 미리 예약하고 AdSense fluid `<ins>`에도 `height:150px`을 지정하므로 최소·최대 범위 안에서 자동으로 높이가 줄어드는 구조는 아니다. [Google 공식 높이 설정](https://support.google.com/adsense/answer/9189959)을 따르며 광고를 잘라내지 않는다. 새 쿠팡 위젯 `1033444`(은민로그 인기글 인피드 생활용품 300x100)를 300×100으로 중앙 정렬한다. 기존 위젯은 보존한다. 운영 광고의 높이 적합성은 배포 후 확인해야 하며 개발 GPT fluid 샘플은 이를 검증하지 못한다.
