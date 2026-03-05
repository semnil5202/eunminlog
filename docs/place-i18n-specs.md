# 장소명/주소 다국어 번역 기능 스펙

> **작성일**: 2026-03-05
> **상태**: 확정 — SE 구현 착수 가능
> **관련 문서**: [database.md](database.md), [seo-strategy.md](seo-strategy.md), [ui-specs.md](ui-specs.md), [architecture.md](architecture.md)

## 1. 개요

### 1-1. 비즈니스 목표

해외 사용자가 게시글 상세 페이지의 장소 정보(place_name, address)를 자국어로 인지할 수 있도록 번역 텍스트를 표시한다. 단, 실제로 한국 내 장소를 검색/방문할 때는 한국어 원문이 필요하므로 복사 시에는 원문을 클립보드에 넣는다.

### 1-2. 핵심 원칙

| 항목 | 규칙 |
|------|------|
| 화면 표시 | 번역된 place_name, address |
| 복사 기능 | 클립보드에는 한글 원문 복사 |
| 토스트 알림 | "정확한 위치 검색을 위해 한국어 원문으로 복사되었습니다" (각 locale 언어) |
| JSON-LD | `itemReviewed.name`과 `address`는 한글 원문 유지 (구조화 데이터 정확도) |
| 한국어 페이지 | 기존 동작 유지 (원문 표시, 원문 복사, 토스트 미표시) |

---

## 2. DB 스키마 변경

### 2-1. `post_translations` 테이블 변경

| Column | Type | Description | Nullable |
|--------|------|-------------|----------|
| `place_name` | text | 번역된 장소명 | YES |
| `address` | text | 번역된 주소 | YES |

**ALTER 문**:

```sql
ALTER TABLE post_translations ADD COLUMN place_name text;
ALTER TABLE post_translations ADD COLUMN address text;
```

**설계 의도**:

- nullable로 설정하여 기존 번역 레코드와의 하위 호환 유지
- place_name/address가 없는 포스트(여행 후기 등)의 번역 레코드에서도 NULL 허용
- 원본 `posts` 테이블의 place_name/address 컬럼은 변경 없음

### 2-2. database.md 업데이트

`post_translations` 테이블 스키마에 `place_name`, `address` 컬럼 추가 반영.

**변경 전**:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | PK |
| `post_id` | uuid (FK) | 원본 포스트 참조 |
| `locale` | text | 언어 코드 |
| `title` | text | 번역된 제목 |
| `description` | text | 번역된 요약 |
| `content` | text | 번역된 본문 (HTML) |
| `created_at` | timestamptz | 번역 생성일 |
| `updated_at` | timestamptz | 번역 수정일 |

**변경 후**:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | PK |
| `post_id` | uuid (FK) | 원본 포스트 참조 |
| `locale` | text | 언어 코드 |
| `title` | text | 번역된 제목 |
| `description` | text | 번역된 요약 |
| `content` | text | 번역된 본문 (HTML) |
| `place_name` | text (nullable) | 번역된 장소명 |
| `address` | text (nullable) | 번역된 주소 |
| `created_at` | timestamptz | 번역 생성일 |
| `updated_at` | timestamptz | 번역 수정일 |

---

## 3. 타입 변경

### 3-1. Client: `PostTranslation` 타입

**파일**: `apps/client/src/shared/types/post.ts`

```typescript
// 변경 전
export type PostTranslation = {
  id: string;
  post_id: string;
  locale: Locale;
  title: string;
  description: string;
  content: string;
  created_at: string;
  updated_at: string;
};

// 변경 후
export type PostTranslation = {
  id: string;
  post_id: string;
  locale: Locale;
  title: string;
  description: string;
  content: string;
  place_name: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};
```

### 3-2. Client: `LocalizedPost` 타입

**파일**: `apps/client/src/shared/types/post.ts`

현재 `LocalizedPost`는 `Omit<Post, 'title' | 'description' | 'content'>`에서 title/description/content만 오버라이드한다. place_name과 address는 `Post` 타입에서 그대로 상속되고 있으므로(**한글 원문**), 번역된 값을 별도 필드로 추가한다.

```typescript
// 변경 전
export type LocalizedPost = {
  title: string;
  description: string;
  content: string;
  locale: Locale;
} & Omit<Post, 'title' | 'description' | 'content'>;

// 변경 후
export type LocalizedPost = {
  title: string;
  description: string;
  content: string;
  locale: Locale;
  translated_place_name: string | null;
  translated_address: string | null;
} & Omit<Post, 'title' | 'description' | 'content'>;
```

**설계 의도**:

- `post.place_name`은 항상 한글 원문 (JSON-LD, 복사 기능에 사용)
- `post.translated_place_name`은 번역된 텍스트 (화면 표시에 사용)
- `post.translated_address`도 동일 패턴
- 한국어 locale에서는 `translated_place_name = null`이므로 원문 폴백
- 원문과 번역을 명시적으로 분리하여 혼동 방지

---

## 4. 번역 API 변경

### 4-1. Client: `getLocalizedPost()` 수정

**파일**: `apps/client/src/features/post-feed/api/translations.ts`

```typescript
// 변경 후
export const getLocalizedPost = async (post: Post, locale: Locale): Promise<LocalizedPost> => {
  const translation = await getTranslation(post.id, locale);

  if (translation) {
    return {
      ...post,
      title: translation.title,
      description: translation.description,
      content: translation.content,
      translated_place_name: translation.place_name,
      translated_address: translation.address,
      locale,
    };
  }

  return {
    ...post,
    translated_place_name: null,
    translated_address: null,
    locale,
  };
};
```

### 4-2. Client: Mock 번역 데이터 업데이트

**파일**: `apps/client/src/features/post-feed/mock/translations.ts`

기존 mock 데이터에 `place_name`, `address` 필드를 추가한다.

```typescript
// 예시 — post-1 (광장시장 빈대떡) English
{
  id: 'trans-1',
  post_id: 'post-1',
  locale: 'en',
  title: 'Gwangjang Market Bindaetteok — 70 Years of Tradition',
  description: '...',
  content: '...',
  place_name: 'Gwangjang Market Bindaetteok Alley',
  address: '88 Changgyeonggung-ro, Jongno-gu, Seoul',
  created_at: '...',
  updated_at: '...',
},
```

---

## 5. 프론트엔드 변경

### 5-1. PlaceInfoCard 컴포넌트 수정

**파일**: `apps/client/src/features/post-detail/components/PlaceInfoCard.astro`

#### Props 변경

```typescript
// 변경 전
interface Props {
  categoryLabel: string;
  subCategoryLabel: string;
  placeName: string;
  address?: string;
  priceMin?: number | null;
  priceMax?: number | null;
  rating?: number;
  locale: Locale;
}

// 변경 후 (구현 완료)
interface Props {
  categoryLabel: string;
  subCategoryLabel: string;
  placeName: string;
  translatedPlaceName?: string | null;
  address: string;
  translatedAddress?: string | null;
  pricePrefix: string | null;
  price: number | null;
  description: string;
  translatedDescription?: string | null;
  locale: Locale;
}
```

#### 필드 라벨 다국어 처리

현재 PlaceInfoCard의 `<dt>` 라벨("카테고리", "장소", "주소", "가격대")이 한국어로 하드코딩되어 있다. 이번 작업에서 함께 다국어 처리한다.

**번역 키 추가** (`translations.ts`):

| 키 | 용도 |
|----|------|
| `place.category` | 카테고리 라벨 |
| `place.name` | 장소 라벨 |
| `place.address` | 주소 라벨 |
| `place.price` | 가격대 라벨 |
| `place.copyToast` | 토스트 메시지 (원문 복사 안내) |

#### 화면 표시 로직

```
표시 텍스트 = translatedPlaceName ?? placeName   (장소명)
표시 텍스트 = translatedAddress ?? address        (주소)
```

- 번역이 있으면 번역 텍스트 표시
- 번역이 없으면 한글 원문 표시 (기존 동작)

#### 복사 버튼 동작 변경

**장소명 복사 버튼**: 장소명 행에도 복사 버튼을 추가한다.

```html
<!-- 장소명 행 -->
<div class="flex items-baseline gap-3">
  <dt class="shrink-0 w-20 text-gray-500 font-medium">{t("place.name", locale)}</dt>
  <dd class="flex items-baseline gap-1.5">
    <span class="text-gray-900 font-semibold" itemprop="name">
      {translatedPlaceName ?? placeName}
    </span>
    <button
      type="button"
      class="copy-place-name shrink-0 translate-y-px text-gray-400 hover:text-gray-600 transition-colors"
      data-copy={placeName}
      data-toast={locale !== 'ko' ? t("place.copyToast", locale) : undefined}
      aria-label={t("place.name", locale) + " copy"}
    >
      <!-- copy SVG icon -->
    </button>
  </dd>
</div>
```

**주소 복사 버튼**: 기존 `.copy-address` 버튼의 `data-address` 값을 항상 한글 원문으로 설정한다.

```html
<!-- 주소 행 -->
<div class="flex items-baseline gap-3">
  <dt class="shrink-0 w-20 text-gray-500 font-medium">{t("place.address", locale)}</dt>
  <dd class="flex items-baseline gap-1.5">
    <span class="text-gray-900" itemprop="address">
      {translatedAddress ?? address}
    </span>
    <button
      type="button"
      class="copy-address shrink-0 translate-y-px text-gray-400 hover:text-gray-600 transition-colors"
      data-copy={address}
      data-toast={locale !== 'ko' ? t("place.copyToast", locale) : undefined}
      aria-label={t("place.address", locale) + " copy"}
    >
      <!-- copy SVG icon -->
    </button>
  </dd>
</div>
```

#### 복사 스크립트 변경

현재 PlaceInfoCard에 인라인 `<script>`로 복사 로직이 있다. 이를 `data-toast` 속성과 전역 `Toast.astro`의 기존 메커니즘을 활용하도록 통합한다.

**변경 전** (현재 인라인 스크립트):
```javascript
document.querySelector('.copy-address')?.addEventListener('click', async (e) => {
  const btn = (e.currentTarget as HTMLButtonElement);
  const address = btn.dataset.address;
  if (!address) return;
  await navigator.clipboard.writeText(address);
  // SVG 아이콘을 체크마크로 1.5초간 교체
});
```

**변경 후**:
```javascript
document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy;
    if (!text) return;

    await navigator.clipboard.writeText(text);

    // 체크마크 피드백
    const svg = btn.querySelector('svg')!;
    const original = svg.innerHTML;
    svg.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
    setTimeout(() => { svg.innerHTML = original; }, 1500);
  });
});
```

- `data-copy` 속성: 클립보드에 복사할 한글 원문
- `data-toast` 속성: Toast.astro의 기존 전역 클릭 이벤트 위임이 자동 처리 (추가 코드 불필요)
- 한국어 locale에서는 `data-toast`를 설정하지 않아 토스트 미표시

#### Schema.org 마이크로데이터

`itemprop="name"`과 `itemprop="address"`에 표시되는 텍스트가 번역 텍스트로 변경되지만, JSON-LD에서 원문을 유지하므로 구조화 데이터 정확도에는 영향 없음. 마이크로데이터와 JSON-LD가 공존하면 Google은 JSON-LD를 우선 사용한다.

> **참고**: 마이크로데이터의 값도 한글 원문으로 유지하고 싶다면 `<meta itemprop="name" content="{placeName}" />` + 별도 `<span>`으로 분리할 수 있다. 그러나 Google은 JSON-LD 우선이므로 복잡도 대비 이점이 적어 현재 구조를 유지한다.

### 5-2. PostLayout.astro에서 Props 전달

**파일**: `apps/client/src/layouts/PostLayout.astro`

PlaceInfoCard 호출부에 `translatedPlaceName`, `translatedAddress` props를 추가한다.

```astro
<!-- 변경 전 -->
<PlaceInfoCard
  categoryLabel={categoryLabel}
  subCategoryLabel={subCategoryLabel}
  placeName={post.place_name}
  address={post.address}
  priceMin={post.price_min}
  priceMax={post.price_max}
  rating={post.rating}
  locale={locale}
/>

<!-- 변경 후 -->
<PlaceInfoCard
  categoryLabel={categoryLabel}
  subCategoryLabel={subCategoryLabel}
  placeName={post.place_name}
  translatedPlaceName={post.translated_place_name}
  address={post.address}
  translatedAddress={post.translated_address}
  pricePrefix={post.price_prefix}
  price={post.price}
  description={post.description}
  locale={locale}
/>
```

### 5-3. JSON-LD 스키마 (원문 유지)

**파일**: `apps/client/src/features/post-detail/lib/schema.ts`

**변경 없음.** `buildReviewSchema()`는 `post.place_name`과 `post.address`를 사용하며, 이 두 필드는 항상 한글 원문이다. `LocalizedPost` 타입 변경 후에도 이 동작은 유지된다.

```typescript
// 변경 없음 — 이미 원문 사용 중
return {
  itemReviewed: {
    type: 'Restaurant' as const,
    name: post.place_name,         // 항상 한글 원문
    address: post.address ?? '',   // 항상 한글 원문
  },
  ...
};
```

### 5-4. 검색 데이터

**파일**: `apps/client/src/features/search/api/search-data.ts`

`SearchItem.placeName`은 현재 `post.place_name` (한글 원문)을 사용한다. 다국어 검색 페이지에서 번역된 장소명으로 검색할 수 있도록 변경한다.

```typescript
// 변경 전
placeName: p.place_name,

// 변경 후
placeName: p.translated_place_name ?? p.place_name,
```

추천 키워드도 동일하게 번역된 장소명을 사용한다.

```typescript
// 변경 전
const placeNames = [...new Set(posts.map((p) => p.place_name).filter(Boolean))] as string[];

// 변경 후
const placeNames = [...new Set(
  posts.map((p) => p.translated_place_name ?? p.place_name).filter(Boolean),
)] as string[];
```

### 5-5. 피드 JSON API

**파일**: `apps/client/src/pages/api/feed/[...path].json.ts`

`FeedPostData.placeName`에서 번역된 장소명을 사용하도록 변경한다. 피드 카드에 장소명이 표시되므로 사용자 언어에 맞는 텍스트를 제공한다.

```typescript
// 변경 전
placeName: post.place_name || null,

// 변경 후 (buildFeedPostData 함수 내에서 localized 객체 사용)
placeName: localized.translated_place_name ?? post.place_name ?? null,
```

### 5-6. PostCard / SponsoredCard 장소명

**파일**: `apps/client/src/features/post-feed/components/PostCard.astro`, `SponsoredCard.astro`

이 컴포넌트들은 `post.place_name`을 직접 표시한다. `LocalizedPost` 타입에 `translated_place_name`이 추가되므로, 표시 텍스트를 변경한다.

```astro
<!-- 변경 전 -->
{post.place_name && (
  ...
  <span>{post.place_name}</span>
)}

<!-- 변경 후 -->
{post.place_name && (
  ...
  <span>{post.translated_place_name ?? post.place_name}</span>
)}
```

---

## 6. i18n 번역 키 추가

**파일**: `apps/client/src/shared/lib/i18n/translations.ts`

### 6-1. 신규 번역 키

| 키 | ko | en | ja | zh-CN | zh-TW | id | vi | th |
|----|----|----|----|----|----|----|----|----|
| `place.category` | 카테고리 | Category | カテゴリー | 分类 | 分類 | Kategori | Danh mục | หมวดหมู่ |
| `place.name` | 장소 | Place | 場所 | 地点 | 地點 | Tempat | Địa điểm | สถานที่ |
| `place.address` | 주소 | Address | 住所 | 地址 | 地址 | Alamat | Địa chỉ | ที่อยู่ |
| `place.price` | 가격대 | Price | 価格帯 | 价格 | 價格 | Harga | Giá | ราคา |
| `place.copyToast` | (빈 문자열) | Copied in original Korean for accurate location search. (+ 수동 복사 안내) | 正確な位置検索のため韓国語の原文でコピーされました。(+ 수동 복사 안내) | 为了准确搜索位置，已复制韩语原文。(+ 수동 복사 안내) | 為了準確搜尋位置，已複製韓語原文。(+ 수동 복사 안내) | Disalin dalam bahasa Korea asli untuk pencarian lokasi yang akurat. (+ 수동 복사 안내) | Đã sao chép bản gốc tiếng Hàn để tìm kiếm vị trí chính xác. (+ 수동 복사 안내) | คัดลอกต้นฉบับภาษาเกาหลีเพื่อค้นหาตำแหน่งได้แม่นยำ (+ 수동 복사 안내) |

> **참고**: `place.copyToast` 메시지는 2줄 구성 (`\n` 구분). 1줄: 한국어 원문 복사 안내, 2줄: 해당 언어로 복사가 필요하면 수동 복사 안내. `place.price`는 "가격대"가 아닌 짧은 라벨("Price", "価格帯" 등)로 구현됨.

### 6-2. 한국어 locale에서 `place.copyToast` 미사용

한국어 페이지에서는 원문이 곧 표시 텍스트이므로 토스트 알림이 불필요하다. `data-toast`를 `undefined`로 설정하여 토스트를 트리거하지 않는다.

---

## 7. Admin 앱 변경

### 7-1. GPT 번역 파이프라인 (GPT-5 Nano 예정)

> Admin의 번역 기능은 아직 미구현 상태 (Phase 4+). 구현 시 아래 스펙을 반영한다.

**번역 요청 프롬프트에 포함할 필드**:

```
기존: title, description, content
추가: place_name, address
```

**번역 응답 파싱**:

GPT 응답에서 `place_name`, `address` 번역 결과를 추출하여 `post_translations` 테이블에 함께 저장한다.

**place_name/address 번역 지침 (프롬프트에 포함)**:

- place_name: 장소의 고유 명사는 음역(transliteration)으로 번역. 일반 명사 부분만 의역.
  - 예: "광장시장 빈대떡골목" → "Gwangjang Market Bindaetteok Alley" (en)
  - 예: "을지로 노가리 골목" → "Euljiro Nogari Alley" (en)
- address: 한국 주소 체계를 해당 언어권 독자가 이해할 수 있는 형태로 번역.
  - 예: "서울특별시 종로구 창경궁로 88" → "88 Changgyeonggung-ro, Jongno-gu, Seoul" (en)
  - 예: "서울特別市 鍾路区 昌慶宮路 88" (ja)

### 7-2. 포스트 저장/편집 시 번역 연동

포스트 저장 Server Action에서:

1. `posts` 테이블에 원문 place_name, address 저장 (기존 로직)
2. `is_multilingual === true`이면 GPT 번역 요청 시 place_name, address 포함
3. 번역 결과를 `post_translations` 테이블에 place_name, address와 함께 INSERT/UPSERT

---

## 8. 기존 데이터 마이그레이션

### 8-1. Supabase 마이그레이션

```sql
-- 1. 컬럼 추가
ALTER TABLE post_translations ADD COLUMN place_name text;
ALTER TABLE post_translations ADD COLUMN address text;

-- 2. 기존 번역 레코드에 대한 place_name, address 번역은
--    Admin에서 해당 포스트를 편집/재번역할 때 자동으로 채워진다.
--    기존 번역 레코드의 place_name, address는 NULL 상태로 유지해도 무방하다.
--    (프론트엔드에서 NULL이면 한글 원문으로 폴백)
```

### 8-2. 기존 번역 데이터 일괄 업데이트 (선택)

기존 번역 레코드가 적은 경우: Admin에서 해당 포스트를 열고 "재번역" 버튼을 누르면 place_name, address를 포함한 새 번역이 생성된다.

기존 번역 레코드가 많은 경우: 일괄 번역 스크립트를 작성하여 처리한다.

```
현재 mock 데이터 기준: 3개 번역 레코드 (post-1 en, post-11 en, post-11 ja)
→ 수동 업데이트로 충분
```

---

## 9. 영향 범위 요약

### 9-1. Client (apps/client) 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `shared/types/post.ts` | PostTranslation에 place_name, address 추가. LocalizedPost에 translated_place_name, translated_address 추가 |
| `features/post-feed/api/translations.ts` | getLocalizedPost()에서 translated_place_name, translated_address 매핑 |
| `features/post-feed/mock/translations.ts` | mock 데이터에 place_name, address 추가 |
| `features/post-detail/components/PlaceInfoCard.astro` | Props 추가, 번역 텍스트 표시, 장소명 복사 버튼 추가, 복사 스크립트 변경, 필드 라벨 다국어 처리 |
| `layouts/PostLayout.astro` | PlaceInfoCard에 translatedPlaceName, translatedAddress props 전달 |
| `shared/lib/i18n/translations.ts` | place.category, place.name, place.address, place.price, place.copyOriginal 키 추가 |
| `features/search/api/search-data.ts` | placeName, 추천 키워드에 번역 텍스트 사용 |
| `pages/api/feed/[...path].json.ts` | FeedPostData.placeName에 번역 텍스트 사용 |
| `features/post-feed/components/PostCard.astro` | place_name 표시를 translated_place_name 우선으로 변경 |
| `features/post-feed/components/SponsoredCard.astro` | place_name 표시를 translated_place_name 우선으로 변경 |

### 9-2. 변경하지 않는 파일

| 파일 | 이유 |
|------|------|
| `features/post-detail/lib/schema.ts` | JSON-LD는 한글 원문을 사용. `post.place_name`, `post.address`가 이미 원문 |
| `shared/types/seo.ts` | ReviewSchema 타입 변경 없음 |
| `shared/components/seo/BlogPostingJsonLd.astro` | 스키마 빌더 입력이 변경되지 않으므로 변경 불필요 |

### 9-3. Admin (apps/admin) 변경

| 항목 | 변경 내용 | 시점 |
|------|-----------|------|
| GPT 번역 프롬프트 (GPT-5 Nano 예정) | place_name, address 포함 | Phase 4+ (번역 기능 구현 시) |
| 포스트 저장 Server Action | 번역 결과에 place_name, address 포함하여 저장 | Phase 4+ |

### 9-4. DB 변경

| 변경 | SQL |
|------|-----|
| post_translations 컬럼 추가 | `ALTER TABLE post_translations ADD COLUMN place_name text; ALTER TABLE post_translations ADD COLUMN address text;` |

---

## 10. 구현 순서

| 순서 | 작업 | 우선순위 | 의존성 |
|------|------|----------|--------|
| 1 | DB: post_translations 테이블에 place_name, address 컬럼 추가 (Supabase) | P0 | 없음 |
| 2 | Client: PostTranslation, LocalizedPost 타입 변경 | P0 | #1 |
| 3 | Client: translations.ts — getLocalizedPost() 수정 | P0 | #2 |
| 4 | Client: mock/translations.ts — mock 데이터에 place_name, address 추가 | P0 | #2 |
| 5 | Client: i18n/translations.ts — place.* 번역 키 추가 | P0 | 없음 |
| 6 | Client: PlaceInfoCard.astro — Props 추가, 번역 표시, 복사 버튼 변경, 라벨 다국어 | P0 | #2, #3, #5 |
| 7 | Client: PostLayout.astro — PlaceInfoCard props 전달 | P0 | #6 |
| 8 | Client: PostCard.astro, SponsoredCard.astro — translated_place_name 표시 | P1 | #2, #3 |
| 9 | Client: search-data.ts — 번역 장소명 사용 | P1 | #2, #3 |
| 10 | Client: feed JSON API — 번역 장소명 사용 | P1 | #2, #3 |
| 11 | docs: database.md 업데이트 | P0 | #1 |
| 12 | Admin: GPT-5 Nano 번역 파이프라인에 place_name, address 포함 | P1 | Phase 4+ 구현 시 |

> **참고**: #1(DB 변경)은 Supabase 콘솔에서 직접 실행. #2~#10은 SE가 한 PR로 구현 가능. #12는 Admin 번역 기능 구현 시점에 반영.

---

## 11. PlaceInfoCard 필드 라벨 다국어 (부수 작업)

현재 PlaceInfoCard의 `<dt>` 라벨이 한국어로 하드코딩되어 있어, 이번 작업에서 함께 다국어 처리한다. 이는 기존에 누락되어 있던 부분이다.

**변경 전**:
```html
<dt class="shrink-0 w-20 text-gray-500 font-medium">카테고리</dt>
<dt class="shrink-0 w-20 text-gray-500 font-medium">장소</dt>
<dt class="shrink-0 w-20 text-gray-500 font-medium">주소</dt>
<dt class="shrink-0 w-20 text-gray-500 font-medium">가격대</dt>
```

**변경 후**:
```html
<dt class="shrink-0 w-20 text-gray-500 font-medium">{t("place.category", locale)}</dt>
<dt class="shrink-0 w-20 text-gray-500 font-medium">{t("place.name", locale)}</dt>
<dt class="shrink-0 w-20 text-gray-500 font-medium">{t("place.address", locale)}</dt>
<dt class="shrink-0 w-20 text-gray-500 font-medium">{t("place.price", locale)}</dt>
```

> **확정**: `<dt>` 너비는 `w-20`(80px)으로 결정. 8개 locale 라벨 텍스트를 모두 수용한다.

---

## 12. 검증 체크리스트

- [ ] 한국어 상세 페이지: 장소명/주소 한글 표시, 복사 시 한글 복사, 토스트 미표시
- [ ] 다국어 상세 페이지: 장소명/주소 번역 표시, 복사 시 한글 원문 복사, 토스트 표시 (해당 locale 언어)
- [ ] 번역 없는 다국어 페이지: 장소명/주소 한글 원문 폴백, 복사 시 한글 복사, 토스트 표시
- [ ] JSON-LD: `itemReviewed.name`과 `address`가 한글 원문인지 확인
- [ ] 검색 페이지: 다국어 검색에서 번역된 장소명으로 검색 가능
- [ ] 피드 카드: 다국어 피드에서 번역된 장소명 표시
- [ ] PlaceInfoCard 필드 라벨: 각 locale에서 올바른 언어로 표시
- [ ] 장소명 복사 버튼: 클릭 시 한글 원문 복사 + 체크마크 피드백 + 토스트
- [ ] 주소 복사 버튼: 기존 동작 유지 + 토스트 추가 (다국어만)
- [ ] `<dt>` 너비가 모든 locale 라벨을 수용하는지 확인
