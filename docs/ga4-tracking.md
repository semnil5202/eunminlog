# GA4 Event Tracking Strategy

> 작성일: 2026-03-01
> 상태: Draft (PM 기획)

## 1. Overview

### 목적

은민로그의 사용자 행동 데이터를 GA4로 수집하여 다음 비즈니스 의사결정을 지원한다.

| 수집 목표                   | 비즈니스 활용                                |
| --------------------------- | -------------------------------------------- |
| 어떤 게시글이 조회되는가    | 인기 콘텐츠 파악, 카테고리별 트래픽 분석     |
| 어떤 게시글이 클릭되는가    | 피드 CTR 최적화, 썸네일/제목 A/B 테스트 기초 |
| 광고가 노출/조회/클릭되는가 | 광고 수익 최적화, 배치 전략 수립             |

### 기술 환경 제약

- **Astro 5 SSG**: 서버 런타임 없음. 모든 트래킹은 클라이언트 JavaScript로 처리.
- **gtag.js 설치 완료**: `Layout.astro`에 `gtag('config', GA_MEASUREMENT_ID)` 이미 존재. GA4 기본 `page_view`는 자동 수집됨.
- **IntersectionObserver 사용 중**: 무한스크롤 피드에서 이미 사용. 광고 뷰포트 감지에 동일 패턴 활용 가능.
- **react-ga4 미사용**: Astro SSG에서는 gtag API 직접 호출이 적합. React island에서도 `window.gtag()` 직접 호출.

### GA4 Measurement ID

```
G-QX8XPFX6YK (packages/config/site.ts)
```

---

## 2. Event Schema

### 2.1 Enhanced Page View (`page_view` -- 커스텀 파라미터 확장)

GA4의 자동 `page_view`는 `page_location`, `page_title`만 수집한다. 게시글의 구조화된 메타데이터(ID, 카테고리, 협찬 여부 등)를 추가 수집하기 위해 커스텀 파라미터를 보낸다.

#### 전략: `gtag('config')` 시점에 커스텀 파라미터 주입

`Layout.astro`의 기존 `gtag('config')` 호출에 페이지별 커스텀 파라미터를 추가한다. GA4는 `config` 호출 시 자동으로 `page_view` 이벤트를 발생시키므로, 여기에 파라미터를 함께 전달하면 `page_view` 이벤트에 커스텀 파라미터가 포함된다.

#### 리스트 페이지 (홈, 카테고리, 서브카테고리)

| 파라미터               | 타입   | 예시          | 설명                                             |
| ---------------------- | ------ | ------------- | ------------------------------------------------ |
| `page_type`            | string | `"list"`      | 페이지 유형                                      |
| `content_category`     | string | `"delicious"` | 카테고리 slug (홈은 `"all"`)                     |
| `content_sub_category` | string | `"korean"`    | 서브카테고리 slug (카테고리 인덱스/홈은 `"all"`) |
| `content_locale`       | string | `"ko"`        | 현재 locale                                      |

#### 상세 페이지 (게시글)

| 파라미터               | 타입    | 예시              | 설명              |
| ---------------------- | ------- | ----------------- | ----------------- |
| `page_type`            | string  | `"post"`          | 페이지 유형       |
| `content_slug`         | string  | `"gangnam-pasta"` | 게시글 slug       |
| `content_category`     | string  | `"delicious"`     | 카테고리 slug     |
| `content_sub_category` | string  | `"korean"`        | 서브카테고리 slug |
| `content_locale`       | string  | `"ko"`            | 현재 locale       |
| `is_sponsored`         | boolean | `true`            | 협찬 여부         |

---

### 2.2 Post Card Click (`select_content`)

사용자가 피드에서 게시글 카드를 클릭할 때 발생한다. GA4 추천 이벤트 `select_content`를 사용한다.

| 파라미터               | 타입    | 예시              | 설명                            |
| ---------------------- | ------- | ----------------- | ------------------------------- |
| `content_type`         | string  | `"post"`          | 콘텐츠 유형 (GA4 추천 파라미터) |
| `content_slug`         | string  | `"gangnam-pasta"` | 게시글 slug                     |
| `content_category`     | string  | `"delicious"`     | 카테고리                        |
| `content_sub_category` | string  | `"korean"`        | 서브카테고리                    |
| `is_sponsored`         | boolean | `true`            | 협찬 여부                       |

---

### 2.3 AdSense Tracking

애드센스 광고의 3단계 사용자 인터랙션을 추적한다.

#### 2.3.1 Ad Impression (`ad_impression`)

광고 슬롯이 DOM에 렌더링되어 **뷰포트에 진입한 시점**에 발생한다. IntersectionObserver로 감지한다.

| 파라미터      | 타입   | 예시             | 설명                |
| ------------- | ------ | ---------------- | ------------------- |
| `ad_slot`     | string | `"in_feed_1"`    | 광고 슬롯 식별자    |
| `ad_format`   | string | `"in_feed"`      | 광고 포맷           |
| `ad_position` | string | `"feed_index_1"` | 페이지 내 배치 위치 |
| `page_type`   | string | `"list"`         | 현재 페이지 유형    |

#### 2.3.2 Ad View (`ad_view` -- 커스텀 이벤트)

광고가 뷰포트에서 **1초 이상 체류**한 시점에 발생한다. 스크롤 중 스쳐 지나간 광고와 실제 인지된 광고를 구분하기 위함이다.

| 파라미터           | 타입   | 예시             | 설명                  |
| ------------------ | ------ | ---------------- | --------------------- |
| `ad_slot`          | string | `"in_feed_1"`    | 광고 슬롯 식별자      |
| `ad_format`        | string | `"in_feed"`      | 광고 포맷             |
| `ad_position`      | string | `"feed_index_1"` | 페이지 내 배치 위치   |
| `page_type`        | string | `"list"`         | 현재 페이지 유형      |
| `view_duration_ms` | number | `1000`           | 뷰포트 체류 시간 (ms) |

#### 2.3.3 Ad Click (`ad_click` -- 커스텀 이벤트)

사용자가 광고 영역을 클릭한 시점에 발생한다.

| 파라미터      | 타입   | 예시             | 설명                |
| ------------- | ------ | ---------------- | ------------------- |
| `ad_slot`     | string | `"in_feed_1"`    | 광고 슬롯 식별자    |
| `ad_format`   | string | `"in_feed"`      | 광고 포맷           |
| `ad_position` | string | `"feed_index_1"` | 페이지 내 배치 위치 |
| `page_type`   | string | `"list"`         | 현재 페이지 유형    |

#### `ad_slot` / `ad_format` / `ad_position` 값 정의

| 광고 유형              | `ad_slot`        | `ad_format`    | `ad_position`         |
| ---------------------- | ---------------- | -------------- | --------------------- |
| In-Feed (index 1)      | `"in_feed_1"`    | `"in_feed"`    | `"feed_index_1"`      |
| In-Feed (index 3)      | `"in_feed_2"`    | `"in_feed"`    | `"feed_index_3"`      |
| Fixed (게시글 상단)    | `"post_top"`     | `"fixed"`      | `"post_top"`          |
| Fixed (사이드바)       | `"sidebar"`      | `"fixed"`      | `"right_sidebar"`     |
| In-Article (본문 중간) | `"in_article_N"` | `"in_article"` | `"article_section_N"` |

> `N`은 본문 내 삽입 순서 (1, 2, ...).

---

### 2.4 Search (`search` -- GA4 추천 이벤트)

사용자가 검색을 실행할 때 발생한다. GA4 추천 이벤트 `search`를 사용한다.

| 파라미터      | 타입   | 예시            | 설명        |
| ------------- | ------ | --------------- | ----------- |
| `search_term` | string | `"강남 파스타"` | 검색 키워드 |

#### 구현 위치

`SearchUI.astro`의 검색 실행 시점(input 이벤트 또는 submit)에서 `gtag('event', 'search', { search_term })` 호출. 디바운스를 적용하여 타이핑 중 과도한 이벤트 발생을 방지한다.

---

### 2.5 Cookie Consent (`cookie_consent` -- 커스텀 이벤트)

사용자가 쿠키 동의 배너에서 수락 또는 거부를 선택한 시점에 발생한다. 상세 스펙: [`docs/cookie-consent-specs.md`](cookie-consent-specs.md)

| 파라미터         | 타입   | 예시                    | 설명               |
| ---------------- | ------ | ----------------------- | ------------------ |
| `action`         | string | `"accept"` / `"reject"` | 사용자 선택        |
| `content_locale` | string | `"en"`                  | 현재 페이지 locale |

**대상 locale**: `en`, `ja`, `zh-CN`, `th` (CONSENT_REQUIRED_LOCALES)

**구현 위치**: `features/consent/components/CookieConsentBanner.astro` 인라인 스크립트에서 `window.gtag()` 직접 호출

---

## 3. Implementation Guide

### 3.1 파일 구조

```
apps/client/src/
├── shared/
│   └── lib/
│       └── analytics/
│           ├── gtag.ts          # gtag() 타입 선언 + 래퍼 함수
│           ├── post-tracker.ts  # PostCard 클릭 트래킹 (이벤트 위임)
│           └── ad-tracker.ts    # 광고 impression/view/click 트래킹
```

**배치 원칙**: analytics는 특정 feature에 속하지 않는 크로스커팅 관심사이므로 `shared/lib/analytics/`에 위치한다.

---

### 3.2 `gtag.ts` -- 타입 안전 래퍼

```typescript
// gtag() 호출을 타입 안전하게 래핑한다.

type GtagEvent =
  | 'select_content'
  | 'search'
  | 'ad_impression'
  | 'ad_view'
  | 'ad_click'
  | 'cookie_consent';

type GtagParams = Record<string, string | number | boolean>;

export function trackEvent(event: GtagEvent, params: GtagParams): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', event, params);
  }
}
```

**window.gtag 타입 선언**: `env.d.ts` 또는 별도 `global.d.ts`에 추가.

```typescript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}
```

---

### 3.3 Enhanced Page View 구현

#### 변경 대상: `Layout.astro`

현재 `gtag('config')` 호출에 페이지별 커스텀 파라미터를 주입한다. 각 레이아웃/페이지에서 `Layout.astro`로 data를 전달한다.

**변경 전 (현재)**:

```html
<script is:inline define:vars="{{" GA_MEASUREMENT_ID }}>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
</script>
```

**변경 후**:

```html
<script is:inline define:vars="{{" GA_MEASUREMENT_ID, gaPageParams }}>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, gaPageParams);
</script>
```

#### Props 추가: `Layout.astro`

```typescript
interface Props {
  // ... 기존 props
  gaPageParams?: Record<string, string | number | boolean>;
}
```

#### 데이터 전달 체인

```
Page (.astro) → PostLayout / ListLayout → Layout.astro → gtag('config', ID, params)
```

**리스트 페이지 예시** (`pages/[category]/index.astro`):

```typescript
const gaPageParams = {
  page_type: 'list',
  content_category: category,
  content_sub_category: 'all',
  content_locale: locale,
};
```

**상세 페이지 예시** (`pages/[category]/[sub_category]/[slug].astro`):

```typescript
const gaPageParams = {
  page_type: 'post',
  content_slug: post.slug,
  content_category: post.category,
  content_sub_category: post.sub_category,
  content_locale: locale,
  is_sponsored: post.is_sponsored,
};
```

---

### 3.4 Post Card Click 구현

#### 전략: 이벤트 위임 (Event Delegation)

PostCard는 SSG 빌드 타임에 렌더링되고, 무한스크롤로 동적 추가된다. 개별 카드에 이벤트 리스너를 부착하는 대신 **피드 컨테이너에 이벤트 위임**을 사용한다.

#### data 속성

각 PostCard/SponsoredCard의 `<article>` 요소에 data 속성을 추가한다.

```html
<article
  class="group"
  data-post-slug="{post.slug}"
  data-post-category="{post.category}"
  data-post-sub-category="{post.sub_category}"
  data-post-sponsored="{String(post.is_sponsored)}"
></article>
```

#### 트래킹 스크립트 (`post-tracker.ts`)

```typescript
import { trackEvent } from './gtag';

export function initPostClickTracker(containerId: string): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.addEventListener('click', (e) => {
    const article = (e.target as HTMLElement).closest('article[data-post-slug]');
    if (!article) return;

    trackEvent('select_content', {
      content_type: 'post',
      content_slug: article.dataset.postSlug!,
      content_category: article.dataset.postCategory!,
      content_sub_category: article.dataset.postSubCategory!,
      is_sponsored: article.dataset.postSponsored === 'true',
    });
  });
}
```

#### 스크립트 로드 위치

- **SSG 피드** (`PostCardGrid.astro`): `<script>` 태그에서 `initPostClickTracker('post-feed')` 호출.
- **검색 결과** (`SearchUI.astro`): 검색 결과 컨테이너에 동일 패턴 적용.
- **인근 포스트** (`NearbyPostList.astro`): 별도 컨테이너 ID로 호출.
- **협찬 리스트** (`SponsoredPostList.astro`): 별도 컨테이너 ID로 호출.

---

### 3.5 AdSense Tracking 구현

#### 전략: IntersectionObserver + Timer

광고 슬롯의 뷰포트 진입/체류를 IntersectionObserver로 감지한다. 이미 무한스크롤에서 동일 패턴을 사용 중이므로 팀에 익숙한 패턴이다.

#### data 속성

각 광고 컴포넌트(`InFeedAdsense.astro`, `FixedAdsense.astro`)에 data 속성을 추가한다.

```html
<!-- InFeedAdsense -->
<div
  class="..."
  role="complementary"
  data-ad-slot="in_feed_1"
  data-ad-format="in_feed"
  data-ad-position="feed_index_1"
>
  <!-- FixedAdsense variant="post-top" -->
  <div
    class="..."
    role="complementary"
    data-ad-slot="post_top"
    data-ad-format="fixed"
    data-ad-position="post_top"
  ></div>
</div>
```

#### 트래킹 스크립트 (`ad-tracker.ts`)

```typescript
import { trackEvent } from './gtag';

export function initAdTracker(pageType: string): void {
  const adSlots = document.querySelectorAll<HTMLElement>('[data-ad-slot]');
  if (adSlots.length === 0) return;

  const impressed = new Set<string>();
  const viewed = new Set<string>();
  const viewTimers = new Map<string, number>();

  // Impression + View 감지
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const slot = el.dataset.adSlot!;

        if (entry.isIntersecting) {
          // Impression (최초 1회)
          if (!impressed.has(slot)) {
            impressed.add(slot);
            trackEvent('ad_impression', {
              ad_slot: slot,
              ad_format: el.dataset.adFormat!,
              ad_position: el.dataset.adPosition!,
              page_type: pageType,
            });
          }

          // View 타이머 시작 (1초 체류)
          if (!viewed.has(slot)) {
            const timer = window.setTimeout(() => {
              viewed.add(slot);
              trackEvent('ad_view', {
                ad_slot: slot,
                ad_format: el.dataset.adFormat!,
                ad_position: el.dataset.adPosition!,
                page_type: pageType,
                view_duration_ms: 1000,
              });
            }, 1000);
            viewTimers.set(slot, timer);
          }
        } else {
          // 뷰포트 이탈 시 타이머 취소
          const timer = viewTimers.get(slot);
          if (timer) {
            window.clearTimeout(timer);
            viewTimers.delete(slot);
          }
        }
      }
    },
    { threshold: 0.5 },
  );

  adSlots.forEach((el) => observer.observe(el));

  // Click 감지
  adSlots.forEach((el) => {
    el.addEventListener('click', () => {
      trackEvent('ad_click', {
        ad_slot: el.dataset.adSlot!,
        ad_format: el.dataset.adFormat!,
        ad_position: el.dataset.adPosition!,
        page_type: pageType,
      });
    });
  });
}
```

#### 동적 광고 슬롯 처리

무한스크롤로 추가 로드된 In-Feed 광고 슬롯도 트래킹해야 한다. `PostCardGrid.astro`의 기존 `loadNextPage()` 함수에서 동적으로 생성하는 광고 슬롯에도 data 속성을 부여하고, 생성 직후 observer에 등록한다.

**방법**: `ad-tracker.ts`에서 `observeNewAdSlot(element)` 함수를 export하여, `createAdSlot()` 호출 후 바로 observer에 추가한다.

```typescript
// ad-tracker.ts (추가)
let sharedObserver: IntersectionObserver | null = null;

export function observeNewAdSlot(el: HTMLElement): void {
  if (sharedObserver && el.dataset.adSlot) {
    sharedObserver.observe(el);
  }
}
```

---

### 3.6 무한스크롤 동적 카드의 Click Tracking

`PostCardGrid.astro`의 `createPostCard()` 함수에서 동적으로 생성하는 카드에도 `data-post-*` 속성을 부여한다. 이벤트 위임 방식이므로 컨테이너에 리스너가 이미 등록되어 있어 추가 리스너 부착이 필요 없다.

**`createPostCard()` 변경 사항**:

```javascript
const article = document.createElement('article');
article.className = 'group';
article.dataset.postSlug = post.slug;
article.dataset.postCategory = post.category;
article.dataset.postSubCategory = post.subCategory;
article.dataset.postSponsored = String(post.isSponsored);
```

> 무한스크롤 API 응답에 `slug`, `category`, `sub_category`, `is_sponsored` 필드가 포함되어야 한다.

---

## 4. GA4 Custom Dimensions 설정

GA4 관리 콘솔에서 다음 커스텀 디멘션을 등록해야 한다.

| 디멘션 이름          | 범위  | 파라미터 키            | 설명                               |
| -------------------- | ----- | ---------------------- | ---------------------------------- |
| Page Type            | Event | `page_type`            | 페이지 유형 (list / post / search) |
| Content Slug         | Event | `content_slug`         | 게시글 slug                        |
| Content Category     | Event | `content_category`     | 카테고리 slug                      |
| Content Sub Category | Event | `content_sub_category` | 서브카테고리 slug                  |
| Content Locale       | Event | `content_locale`       | 언어 코드                          |
| Is Sponsored         | Event | `is_sponsored`         | 협찬 여부                          |
| Search Term          | Event | `search_term`          | 검색 키워드                        |
| Ad Slot              | Event | `ad_slot`              | 광고 슬롯 식별자                   |
| Ad Format            | Event | `ad_format`            | 광고 포맷                          |
| Ad Position          | Event | `ad_position`          | 광고 배치 위치                     |
| Consent Action       | Event | `action`               | 쿠키 동의 수락/거부               |

> GA4 무료 계정은 이벤트 범위 커스텀 디멘션 50개, 커스텀 메트릭 50개까지 등록 가능하다. 위 10개는 한도 내에 충분히 들어간다.

---

## 5. 구현 순서 (권장)

| 순서 | 작업                                                    | 우선순위 | 관련 파일                                                           |
| ---- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------- |
| 1    | `shared/lib/analytics/gtag.ts` 생성                     | P0       | 신규 파일                                                           |
| 2    | `window.gtag` 타입 선언 추가                            | P0       | `env.d.ts`                                                          |
| 3    | Enhanced Page View 구현                                 | P0       | `Layout.astro`, 각 page `.astro`                                    |
| 4    | `PostCard.astro` / `SponsoredCard.astro` data 속성 추가 | P0       | 기존 컴포넌트 수정                                                  |
| 5    | `PostCardGrid.astro` 이벤트 위임 + listName prop 추가   | P0       | 기존 컴포넌트 수정                                                  |
| 6    | `shared/lib/analytics/post-tracker.ts` 생성             | P0       | 신규 파일                                                           |
| 7    | `PostCardGrid.astro` 동적 카드에 data 속성 추가         | P1       | 기존 스크립트 수정                                                  |
| 8    | 광고 컴포넌트 data 속성 추가                            | P1       | `InFeedAdsense.astro`, `FixedAdsense.astro`                         |
| 9    | `shared/lib/analytics/ad-tracker.ts` 생성               | P1       | 신규 파일                                                           |
| 10   | 동적 광고 슬롯 observer 연동                            | P1       | `PostCardGrid.astro` 스크립트                                       |
| 11   | GA4 관리 콘솔 커스텀 디멘션 등록                        | P1       | GA4 설정 (코드 외)                                                  |
| 12   | 검색/인근/협찬 리스트 click tracking 적용               | P2       | `SearchUI.astro`, `NearbyPostList.astro`, `SponsoredPostList.astro` |

---

## 6. 변경 영향 분석

### 수정 대상 파일

| 파일                                                                  | 변경 내용                                                       |
| --------------------------------------------------------------------- | --------------------------------------------------------------- |
| `layouts/Layout.astro`                                                | `gaPageParams` prop 추가, `gtag('config')` 호출에 파라미터 주입 |
| `layouts/PostLayout.astro`                                            | `gaPageParams` 생성 및 Layout에 전달                            |
| `layouts/ListLayout.astro`                                            | `gaPageParams` 생성 및 Layout에 전달                            |
| `pages/index.astro`                                                   | `gaPageParams` 생성                                             |
| `pages/[category]/index.astro`                                        | `gaPageParams` 생성                                             |
| `pages/[category]/[sub_category]/index.astro`                         | `gaPageParams` 생성                                             |
| `pages/[category]/[sub_category]/[slug].astro`                        | `gaPageParams` 생성                                             |
| `pages/[locale]/**` (4개 파일)                                        | 동일 패턴 적용                                                  |
| `pages/search.astro`, `pages/[locale]/search.astro`                   | `gaPageParams` 생성                                             |
| `features/post-feed/components/PostCard.astro`                        | `data-post-*` 속성 추가                                         |
| `features/post-feed/components/SponsoredCard.astro`                   | `data-post-*` 속성 추가                                         |
| `features/post-feed/components/PostCardGrid.astro`                    | `listName` prop 추가, 이벤트 위임 스크립트, 동적 카드 data 속성 |
| `shared/components/ad/InFeedAdsense.astro`                            | `data-ad-*` 속성 추가                                           |
| `shared/components/ad/FixedAdsense.astro`                             | `data-ad-*` 속성 추가                                           |
| `features/search/components/SearchUI.astro`                           | 클릭 트래킹 + 동적 광고 data 속성                               |
| `shared/components/layout/NearbyPostList.astro` (경로 주의: features) | 클릭 트래킹                                                     |
| `shared/components/layout/SponsoredPostList.astro`                    | 클릭 트래킹                                                     |

### 신규 파일

| 파일                                   | 역할                              |
| -------------------------------------- | --------------------------------- |
| `shared/lib/analytics/gtag.ts`         | gtag 타입 래퍼 + `trackEvent()`   |
| `shared/lib/analytics/post-tracker.ts` | PostCard 클릭 이벤트 위임         |
| `shared/lib/analytics/ad-tracker.ts`   | 광고 impression/view/click 트래킹 |

### 무한스크롤 API 응답 확인 필요

`pages/api/feed/[...path].json.ts`의 응답에 `slug`, `category`, `sub_category`, `is_sponsored` 필드가 포함되는지 확인 필요.

---

## 7. 성능 영향

| 항목         | 영향                  | 대응                                     |
| ------------ | --------------------- | ---------------------------------------- |
| JS 번들 크기 | 매우 작음 (~1KB gzip) | analytics 모듈은 가벼운 래퍼 함수만 포함 |
| 런타임 성능  | 무시 가능             | 이벤트 위임은 리스너 1개, IO는 passive   |
| 네트워크     | gtag.js 이미 로드됨   | 추가 스크립트 로드 없음                  |
| LCP/CLS      | 영향 없음             | 트래킹 코드는 렌더링에 관여하지 않음     |

---

## 8. 검증 방법

1. **GA4 DebugView**: Chrome GA Debugger 확장 설치 후 GA4 > DebugView에서 실시간 이벤트 확인
2. **브라우저 콘솔**: 개발 시 `trackEvent()` 내부에 `console.debug()` 조건부 추가
3. **GA4 Realtime Report**: 배포 후 실시간 리포트에서 이벤트 수신 확인
4. **Custom Dimension 확인**: GA4 > Explore에서 커스텀 디멘션이 정상 수집되는지 확인

---

## 9. 향후 확장 가능성

- **스크롤 깊이 트래킹**: 상세 페이지에서 25%/50%/75%/100% 스크롤 도달 이벤트
- **체류 시간 트래킹**: 상세 페이지 체류 시간 (GA4 기본 engagement_time과 별도)
- **공유 버튼 트래킹**: 소셜 공유 버튼 클릭 이벤트 (향후 공유 기능 추가 시)
