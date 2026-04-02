# AdSense 지면 복원 가이드

> 애드센스 심사 완료 후 이 문서를 따라 실제 광고 코드를 삽입한다.

## 현재 상태

모든 애드센스 지면이 **주석 처리**되어 있다. 각 위치에 `TODO: 애드센스 되돌리기`로 표시되어 있으며, `grep -r "애드센스 되돌리기" apps/client/src`로 전체 목록을 확인할 수 있다.

## 광고 컴포넌트 (수정 없이 재활용 가능)

| 컴포넌트        | 경로                                           | 역할                                |
| --------------- | ---------------------------------------------- | ----------------------------------- |
| `FixedAdsense`  | `src/shared/components/ad/FixedAdsense.astro`  | 고정 위치 광고 (post-top, sidebar)  |
| `InFeedAdsense` | `src/shared/components/ad/InFeedAdsense.astro` | 인피드 광고 (피드 리스트, 사이드바) |

현재 이 컴포넌트들은 **가짜 플레이스홀더**(회색 박스 + 텍스트)를 렌더링한다. 심사 완료 후 내부 HTML을 실제 애드센스 `<ins>` 태그로 교체해야 한다.

## 광고 트래킹 (수정 없이 재활용 가능)

| 파일                                     | 역할                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `src/shared/lib/analytics/ad-tracker.ts` | `data-ad-slot` 요소에 대한 impression/view/click 이벤트를 GA4로 전송 |

`data-ad-slot`, `data-ad-format`, `data-ad-position` 속성이 광고 요소에 있으면 자동으로 트래킹한다. 실제 애드센스 코드에도 이 속성들을 유지하면 된다.

## 복원 작업 목록

### 1. 애드센스 스크립트 추가

`src/layouts/Layout.astro`의 `<head>` 안에 애드센스 스크립트를 추가한다:

```html
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
  crossorigin="anonymous"
></script>
```

`ca-pub-XXXXXXXXXXXXXXXX`를 실제 퍼블리셔 ID로 교체한다.

### 2. FixedAdsense 컴포넌트 수정

**파일**: `src/shared/components/ad/FixedAdsense.astro`

가짜 플레이스홀더 `<div>...<span>Fixed Adsense</span></div>`를 실제 광고 코드로 교체한다:

```astro
{variant === 'post-top' && (
  <div
    class="mb-6 mx-auto w-[300px] h-[50px] lg:w-[468px] lg:h-[60px]"
    data-ad-slot="post_top"
    data-ad-format="fixed"
    data-ad-position="post_top"
  >
    <ins class="adsbygoogle"
      style="display:block"
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
      data-ad-slot="SLOT_ID_POST_TOP"
      data-ad-format="auto"
      data-full-width-responsive="true">
    </ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>
)}

{variant === 'sidebar' && (
  <div
    class="w-[300px] h-[250px]"
    data-ad-slot="sidebar"
    data-ad-format="fixed"
    data-ad-position="right_sidebar"
  >
    <ins class="adsbygoogle"
      style="display:block"
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
      data-ad-slot="SLOT_ID_SIDEBAR"
      data-ad-format="auto"
      data-full-width-responsive="true">
    </ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>
)}
```

### 3. InFeedAdsense 컴포넌트 수정

**파일**: `src/shared/components/ad/InFeedAdsense.astro`

가짜 플레이스홀더를 실제 인피드 광고 코드로 교체한다:

```astro
<div
  class:list={["w-full", className]}
  data-ad-slot={slotId}
  data-ad-format="in_feed"
  data-ad-position={position}
>
  <ins class="adsbygoogle"
    style="display:block"
    data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
    data-ad-slot="SLOT_ID_IN_FEED"
    data-ad-format="fluid"
    data-ad-layout-key="LAYOUT_KEY">
  </ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>
```

### 4. 주석 처리된 지면 복원

아래 5곳에서 TODO 주석을 해제한다:

| 파일                                                   | 위치   | 복원 내용                                                         |
| ------------------------------------------------------ | ------ | ----------------------------------------------------------------- |
| `src/layouts/PostLayout.astro` (frontmatter)           | ~60행  | `insertInArticleAds(post.content)` 호출 복원                      |
| `src/layouts/PostLayout.astro` (template)              | ~98행  | `<FixedAdsense variant="post-top" />` 주석 해제                   |
| `src/shared/components/layout/RightSidebar.astro`      | ~24행  | `<FixedAdsense variant="sidebar" />` 주석 해제                    |
| `src/features/post-feed/components/PostCardGrid.astro` | ~48행  | `<InFeedAdsense ...>` 주석 해제, `return null;` 제거              |
| `src/features/post-feed/components/PostCardGrid.astro` | ~179행 | 무한스크롤 `createAdSlot()` 호출 주석 해제 (2페이지+ 인피드 광고) |
| `src/shared/components/layout/SponsoredPostList.astro` | ~34행  | `<InFeedAdsense class="h-[104px] my-4" />` 주석 해제              |

### 5. In-Article 광고 (본문 H2 섹션 경계)

**파일**: `src/features/post-detail/lib/ads.ts`

`AD_PLACEHOLDER` 상수의 가짜 HTML을 실제 애드센스 In-Article 코드로 교체한다:

```ts
const AD_PLACEHOLDER = `\n\n<div class="not-prose w-full mx-auto my-8" role="complementary" aria-label="Advertisement"><ins class="adsbygoogle" style="display:block; text-align:center" data-ad-layout="in-article" data-ad-format="fluid" data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" data-ad-slot="SLOT_ID_IN_ARTICLE"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>\n\n`;
```

이 함수(`insertInArticleAds`)는 H2 섹션 2번째와 마지막 앞에 광고를 삽입한다. 로직 수정은 불필요하다.

## 광고 지면 요약

| 지면                | 위치                    | 크기                      | 노출 조건                       |
| ------------------- | ----------------------- | ------------------------- | ------------------------------- |
| Post Top            | 포스트 상단 (본문 위)   | 모바일 300x50 / PC 468x60 | 모든 포스트 상세                |
| Sidebar             | 우측 사이드바 상단      | 300x250                   | PC(lg+)만                       |
| In-Feed             | 피드 리스트 index 1, 3  | 반응형 (aspect 7/3)       | 메인/카테고리/서브카테고리 피드 |
| In-Feed (Sponsored) | 추천 포스트 리스트 중간 | 높이 104px                | 추천 포스트 2개 이하 아래       |
| In-Article          | 포스트 본문 H2 경계     | 반응형 fluid              | H2가 3개 이상인 포스트          |

## 교체해야 할 값

- `ca-pub-XXXXXXXXXXXXXXXX` → 실제 퍼블리셔 ID
- `SLOT_ID_POST_TOP` → 포스트 상단 광고 슬롯 ID
- `SLOT_ID_SIDEBAR` → 사이드바 광고 슬롯 ID
- `SLOT_ID_IN_FEED` → 인피드 광고 슬롯 ID
- `SLOT_ID_IN_ARTICLE` → 본문 내 광고 슬롯 ID
- `LAYOUT_KEY` → 인피드 광고 레이아웃 키 (애드센스 콘솔에서 확인)

## noindex 제거

애드센스 심사와 별도로, 공개 전환 시 검색 페이지의 noindex를 유지하고 나머지 페이지에 noindex가 없는지 확인한다:

- `src/pages/search.astro` — `<meta name="robots" content="noindex, follow" />` 유지 (검색 페이지는 항상 noindex)
- `src/pages/[locale]/search.astro` — 동일하게 유지
