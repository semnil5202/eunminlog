# Admin API Specs

> Last updated: 2026-03-06 (prev_slug 자동 저장 로직 추가)

Admin 앱에서 필요한 API 엔드포인트 목록. Server Action 기반으로 구현하며, Supabase service role 키를 사용한다.

---

## 1. 인증 (Phase 2)

Supabase Auth 클라이언트 SDK 사용 (Server Action 아님).

| 기능      | 메서드                               | 비고           |
| --------- | ------------------------------------ | -------------- |
| 로그인    | `supabase.auth.signInWithPassword()` | email/password |
| 로그아웃  | `supabase.auth.signOut()`            |                |
| 세션 확인 | `supabase.auth.getSession()`         | 앱 로드 시     |

---

## 2. 게시글 CRUD (Phase 3~4)

### 2.1 게시글 생성 — `createPost`

**Type:** Server Action

**Input:**

```typescript
{
  title: string;
  description: string;
  slug: string;                              // unique
  category: string;                          // categories.slug 참조 (대분류)
  sub_category: string;                      // categories.slug 참조 (소분류)
  content: string;                           // Tiptap HTML
  thumbnail: string;                         // S3 CDN URL
  is_sponsored?: boolean;                    // default: false
  is_recommended?: boolean;                  // default: false
  is_multilingual?: boolean;                 // default: true
  rating?: number | null;                    // 1.0~5.0
  place_name?: string | null;
  address?: string | null;
  price_prefix?: string | null;              // 가격 접두어 (예: "메인메뉴 평균: ")
  price?: number | null;                     // 원 단위
}
```

**Output:** `{ postId: string }` or error

**DB:**

```sql
INSERT INTO posts (slug, title, description, content, category, sub_category,
  thumbnail, is_sponsored, is_recommended, is_multilingual, rating,
  place_name, address, price_prefix, price)
VALUES (:slug, :title, :description, :content, :category, :sub_category,
  :thumbnail, :is_sponsored, :is_recommended, :is_multilingual, :rating,
  :place_name, :address, :price_prefix, :price)
RETURNING id;
```

---

### 2.2 게시글 수정 — `updatePost`

**Type:** Server Action

**Input:** `{ postId: string } & Partial<CreatePostInput>`

**Output:** `{ success: boolean }` or error

**DB:**

```sql
-- slug가 변경된 경우: prev_slug에 기존 slug 저장
UPDATE posts
SET slug = :newSlug,
    prev_slug = :oldSlug,
    title = :title, ...,
    updated_at = now()
WHERE id = :postId;

-- slug가 변경되지 않은 경우: prev_slug 유지 (변경하지 않음)
UPDATE posts SET title = :title, ..., updated_at = now()
WHERE id = :postId;
```

**prev_slug 자동 저장 규칙:**

- slug 변경 감지: 현재 DB의 slug와 입력된 slug를 비교
- 변경된 경우에만 기존 slug를 `prev_slug`에 저장
- 이력은 1개만 보관 (이전 `prev_slug` 값은 덮어씀)
- 상세: [`docs/redirect-specs.md`](redirect-specs.md)

---

### 2.3 게시글 조회 (편집용) — `getPost`

**Type:** Server Action

**Input:** `{ postId: string }`

**Output:**

```typescript
{
  post: Post;
  translations: PostTranslation[];
}
```

**DB:**

```sql
-- 인덱스: posts_pkey
SELECT * FROM posts WHERE id = :postId;

-- 인덱스: idx_translations_post_locale
SELECT * FROM post_translations WHERE post_id = :postId;
```

---

### 2.4 게시글 목록 — `listPosts`

**Type:** Server Action

**Input:**

```typescript
{
  page?: number;                // default: 1
  pageSize?: number;            // default: 10
  sortBy?: 'publishedAt' | 'updatedAt';  // default: 'publishedAt'
  dateFrom?: string;            // ISO 8601 (기간 필터 시작)
  dateTo?: string;              // ISO 8601 (기간 필터 끝)
  search?: string;              // title ILIKE 검색
}
```

**Output:**

```typescript
{
  posts: {
    id: string;
    title: string;
    slug: string;
    category: string;
    sub_category: string;
    created_at: string;
    updated_at: string;
  }[];
  total: number;                // 페이지네이션용 총 건수
  page: number;
  pageSize: number;
}
```

**DB:**

```sql
-- 데이터 조회 (sortBy = 'publishedAt' 기준)
-- 인덱스: idx_posts_created_at_desc (range scan + title ILIKE filter)
SELECT id, title, slug, category, sub_category, created_at, updated_at
FROM posts
WHERE created_at BETWEEN :dateFrom AND :dateTo
  AND (:search IS NULL OR title ILIKE '%' || :search || '%')
ORDER BY created_at DESC
LIMIT :pageSize OFFSET (:page - 1) * :pageSize;

-- 총 건수 (동일 조건)
SELECT COUNT(*) FROM posts
WHERE created_at BETWEEN :dateFrom AND :dateTo
  AND (:search IS NULL OR title ILIKE '%' || :search || '%');
```

- `sortBy = 'updatedAt'`일 때: `WHERE updated_at BETWEEN ... ORDER BY updated_at DESC` → `idx_posts_updated_at_desc` 사용
- `dateFrom`/`dateTo` 미지정 시 전체 기간 조회

---

### 2.5 게시글 삭제 — `deletePost`

**Type:** Server Action

**Input:** `{ postId: string }`

**Output:** `{ success: boolean }`

**DB:**

```sql
-- post_translations는 ON DELETE CASCADE로 자동 삭제
DELETE FROM posts WHERE id = :postId;
```

---

## 3. 미디어 업로드 (Phase 4)

### 3.1 S3 Pre-signed URL 발급 — `getPresignedUrl`

**Type:** Server Action

**Input:**

```typescript
{
  fileName: string;
  fileType: 'image/jpeg' | 'image/png' | 'image/webp';
  fileSize: number; // bytes, max 10MB
}
```

**Output:**

```typescript
{
  presignedUrl: string; // PUT용 S3 URL (1시간 유효)
  cdnUrl: string; // 업로드 완료 후 접근 URL (media.eunminlog.site/...)
}
```

**Flow:**

1. Client → Server Action `getPresignedUrl()` (AWS SDK v3 SigV4)
2. Client → `PUT presignedUrl` (S3 직접 업로드)
3. Client가 `cdnUrl`을 폼/에디터에 반영

**사용처:** `ThumbnailUpload`, `UploadImage` (에디터 이미지)

---

## 4. 번역 (Phase 3~4)

번역 파이프라인은 GPT 호출과 DB 저장을 분리한다. GPT 호출 결과를 프리뷰에서 확인한 후 저장한다.

### 4.1 요약 생성 — `generateSummary`

**Type:** Server Action (구현 완료)

**Input:**

```typescript
{
  title: string;
  content: string;               // Tiptap HTML
}
```

**Output:** `{ summary: string }` — 3줄 요약 텍스트 (`\n` 구분)

**External:** OpenAI GPT-5 Nano API

**DB:** 없음 (결과는 클라이언트 폼 state에 반영)

---

### 4.2 슬러그 추천 — `generateSlugSuggestions`

**Type:** Server Action (구현 완료)

**Input:**

```typescript
{
  text: string;                    // 한국어 카테고리명 또는 게시글 제목
}
```

**Output:** `string[]` — 영문 slug 후보 3개

**External:** OpenAI GPT-5 Nano API (`response_format: { type: 'json_object' }`)

**DB:** 없음 (결과는 클라이언트 UI에서 선택/직접 입력)

**사용처:** 카테고리 생성/수정 (`/categories/new`, `/categories/[id]/edit`), 게시글 작성/수정 (`/posts/new`, `/posts/[id]/edit`)

---

### 4.3 용어 추출 — `extractFlaggedTerms`

**Type:** Server Action (구현 완료)

**Input:**

```typescript
{
  title: string;
  description: string;
  content: string;
  place_name?: string | null;
  address?: string | null;
}
```

**Output:**

```typescript
{
  terms: {
    original: string;            // 원문 용어
    context: string;             // 사용 맥락
    suggestion: string;          // 번역 가이드
  }[];
}
```

**External:** OpenAI GPT-5 Nano API

**DB:** 없음 (TranslationSheetContainer에서 용어 검토 UI 표시)

---

### 4.4 번역본 생성 — `translatePost`

**Type:** Server Action (구현 완료)

**Input:**

```typescript
{
  title: string;
  description: string;
  content: string;                           // Tiptap HTML
  place_name?: string | null;
  address?: string | null;
  targetLocales: TranslationLocale[];        // ['en','ja','zh-CN','zh-TW','id','vi','th']
  flaggedTerms?: FlaggedTerm[];              // 용어 가이드
}
```

**Output:**

```typescript
{
  translations: {
    locale: TranslationLocale;
    title: string;
    description: string;
    content: string;
    place_name?: string;
    address?: string;
    failed?: boolean;                        // 해당 locale 번역 실패 여부
  }[];
}
```

**External:** OpenAI GPT-5 Nano API — 7개 locale `Promise.allSettled` 병렬 호출

**DB:** 없음 (결과는 TranslationPreviewSheet에서 프리뷰 표시. DB 저장은 `saveTranslations`에서 별도 수행)

**실패 처리:**

- `Promise.allSettled`로 부분 성공 허용
- 실패한 locale은 `failed: true` 플래그 설정
- 개별 locale 재시도는 `retrySingleLocale`로 처리

---

### 4.5 개별 locale 재번역 — `retrySingleLocale`

**Type:** Server Action (구현 완료)

**Input:**

```typescript
{
  title: string;
  description: string;
  content: string;
  place_name?: string | null;
  address?: string | null;
  targetLocale: TranslationLocale;           // 단일 locale
  flaggedTerms?: FlaggedTerm[];
}
```

**Output:** `translatePost`의 단일 locale 결과와 동일 구조

**External:** OpenAI GPT-5 Nano API (단일 호출)

**DB:** 없음

---

### 4.6 번역 저장 — `saveTranslations`

**Type:** Server Action (미구현)

**Input:**

```typescript
{
  postId: string;
  translations: {
    locale: TranslationLocale;
    title: string;
    description: string;
    content: string;
    place_name?: string | null;
    address?: string | null;
  }[];
}
```

**Output:** `{ success: boolean; savedCount: number }`

**DB:**

```sql
-- locale별 UPSERT (인덱스: idx_translations_post_locale)
INSERT INTO post_translations (post_id, locale, title, description, content, place_name, address)
VALUES (:post_id, :locale, :title, :description, :content, :place_name, :address)
ON CONFLICT (post_id, locale)
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  content = EXCLUDED.content,
  place_name = EXCLUDED.place_name,
  address = EXCLUDED.address,
  updated_at = now();
```

- 게시글 저장 (`createPost` / `updatePost`) 시 번역 데이터도 함께 저장
- 번역이 없는 locale은 skip (partial save 허용)

---

### 4.7 번역 조회 — `getTranslations`

**Type:** Server Action

**Input:** `{ postId: string; locale?: TranslationLocale }`

**Output:** `{ translations: PostTranslation[] }`

**DB:**

```sql
-- 인덱스: idx_translations_post_locale
SELECT * FROM post_translations
WHERE post_id = :postId
  AND (:locale IS NULL OR locale = :locale);
```

---

## 5. 빌드 트리거 (Phase 4)

### 5.1 GitHub Actions 빌드 트리거 — `triggerBuild`

**Type:** Server Action

**Input:**

```typescript
{
  environment: 'production' | 'development';
}
```

**Output:** `{ success: boolean; workflowRunId?: string }`

**External:** GitHub Actions API — `POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches`

**Credentials:** `GITHUB_TOKEN` (env)

---

## 6. 핵심 지표 (Phase 4)

### 6.1 게시글 지표 조회 — `getPostMetrics`

**Type:** Server Action 또는 API Route

**Input:**

```typescript
{
  page?: number;               // default: 1
  pageSize?: number;           // default: 10
  dateFrom?: string;           // ISO 8601
  dateTo?: string;
  sortBy?: 'views' | 'recommendations' | 'comments';
  search?: string;
}
```

**Output:**

```typescript
{
  metrics: {
    id: string;
    title: string;
    views: number;
    recommendations: number;
    comments: number;
    publishedAt: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
}
```

**현재:** mock 데이터 (`apps/admin/src/app/page.tsx`)

**향후:** GA4 Reporting API 또는 Supabase 커스텀 이벤트 테이블

---

## 7. 카테고리 관리 (Phase 5)

### 7.1 카테고리 목록 조회 — `listCategories`

**Type:** Server Action

**Input:**

```typescript
{
  search?: string;             // name ILIKE 검색 (optional)
}
```

**Output:**

```typescript
{
  categories: {
    id: string;
    slug: string;
    name: string;
    parent_id: string | null;
    sort_order: number;
    is_multilingual: boolean;
    created_at: string;
    post_count: number;          // 해당 카테고리에 포함된 게시글 수
  }[];
}
```

**DB:**

```sql
-- 인덱스: idx_categories_parent (GROUP BY), idx_posts_category_sub_created (JOIN)
-- 카테고리 12개 + posts full scan → 현 규모에서 < 10ms
SELECT c.id, c.slug, c.name, c.parent_id, c.sort_order,
       c.is_multilingual, c.created_at,
       COUNT(p.id) AS post_count
FROM categories c
LEFT JOIN posts p ON (
  CASE WHEN c.parent_id IS NULL
    THEN p.category = c.slug
    ELSE p.sub_category = c.slug
  END
)
WHERE (:search IS NULL OR c.name ILIKE '%' || :search || '%')
GROUP BY c.id
ORDER BY c.parent_id NULLS FIRST, c.sort_order;
```

**참고:** 페이지네이션 없음 (pageSize 100, 카테고리 총 수 12개로 단일 페이지)

---

### 7.2 카테고리 생성 — `createCategory`

**Type:** Server Action

**Input:**

```typescript
{
  slug: string;                // unique, URL 경로용
  name: string;                // 표시명
  parent_id?: string | null;   // null이면 대분류, 값이면 소분류
  is_multilingual?: boolean;   // default: true
}
```

**Output:** `{ categoryId: string }` or error

**DB:**

```sql
-- sort_order: 같은 parent 내 마지막 순서 + 1
INSERT INTO categories (slug, name, parent_id, sort_order, is_multilingual)
VALUES (
  :slug, :name, :parent_id,
  COALESCE(
    (SELECT MAX(sort_order) + 1 FROM categories
     WHERE parent_id IS NOT DISTINCT FROM :parent_id),
    0
  ),
  :is_multilingual
)
RETURNING id;
```

**Validation:**

- slug 중복 검사 (UNIQUE 제약으로 DB 레벨에서도 보장)
- parent_id 유효성 검사 (존재하는 대분류인지, 2-depth 초과 방지)

---

### 7.3 카테고리 단건 조회 — `getCategory`

**Type:** Server Action

**Input:** `{ categoryId: string }`

**Output:**

```typescript
{
  category: {
    id: string;
    slug: string;
    name: string;
    parent_id: string | null;
    sort_order: number;
    is_multilingual: boolean;
    created_at: string;
  };
}
```

**DB:**

```sql
-- 인덱스: categories_pkey
SELECT * FROM categories WHERE id = :categoryId;
```

---

### 7.4 카테고리 수정 — `updateCategory`

**Type:** Server Action

**Input:**

```typescript
{
  categoryId: string;
  slug?: string;                 // 변경 시 UNIQUE 검증 필요
  name?: string;
  sort_order?: number;
}
```

**Output:** `{ success: boolean }` or error

**DB:**

```sql
-- slug가 변경된 경우: prev_slug에 기존 slug 저장 + posts 참조값 업데이트
UPDATE categories
SET slug = :newSlug,
    prev_slug = :oldSlug,
    name = COALESCE(:name, name),
    sort_order = COALESCE(:sort_order, sort_order),
    updated_at = now()
WHERE id = :categoryId;

-- posts 참조값 업데이트 (대분류인 경우)
UPDATE posts SET category = :newSlug WHERE category = :oldSlug;
-- posts 참조값 업데이트 (소분류인 경우)
UPDATE posts SET sub_category = :newSlug WHERE sub_category = :oldSlug;

-- slug가 변경되지 않은 경우: prev_slug 유지
UPDATE categories
SET name = COALESCE(:name, name),
    sort_order = COALESCE(:sort_order, sort_order),
    updated_at = now()
WHERE id = :categoryId;
```

**제약:**

- `parent_id`는 수정 불가 (대분류/소분류 계층 변경 방지)
- `is_multilingual`은 수정 불가 (한 번 설정 후 변경 불가 -- 추후 지원 예정)
- `slug` 수정 시 UNIQUE 제약 위반 검사 필요 (DB 레벨 + application 레벨)
- `slug` 수정 시 해당 카테고리를 참조하는 `posts.category` 또는 `posts.sub_category` 값도 함께 업데이트 필요 (application-level, FK 없으므로)
- `slug` 수정 시 기존 slug를 `prev_slug`에 자동 저장 (301 리다이렉트용. 상세: [`docs/redirect-specs.md`](redirect-specs.md))

---

### 7.5 카테고리 삭제 — `deleteCategory`

**Type:** Server Action

**Input:** `{ categoryId: string }`

**Output:** `{ success: boolean }` or error

**Validation:**

1. 해당 카테고리에 포함된 게시글이 있으면 삭제 거부 (post_count > 0)
2. 대분류인 경우 하위 소분류가 존재하면 삭제 거부 (FK ON DELETE RESTRICT)

**DB:**

```sql
-- 1. 게시글 존재 여부 확인
SELECT COUNT(*) FROM posts
WHERE category = :slug OR sub_category = :slug;

-- 2. 게시글 0건일 때만 삭제
DELETE FROM categories WHERE id = :categoryId;
```

---

## 환경변수

| 변수                            | 범위    | 용도                  |
| ------------------------------- | ------- | --------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public  | Supabase URL          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public  | 클라이언트 인증       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Private | Server Action DB 접근 |
| `OPENAI_API_KEY`                | Private | GPT-5 Nano 번역+요약  |
| `GITHUB_TOKEN`                  | Private | 빌드 트리거           |
| `AWS_ACCESS_KEY_ID`             | Private | S3 Pre-signed URL     |
| `AWS_SECRET_ACCESS_KEY`         | Private | S3 Pre-signed URL     |

---

## 구현 우선순위

| 순서 | API                                                        | Phase | 상태       |
| ---- | ---------------------------------------------------------- | ----- | ---------- |
| 1    | `createPost`, `updatePost`, `getPost`                      | 3     | 미구현     |
| 2    | `signIn`, `signOut`, `getSession`                          | 2     | 미구현     |
| 3    | `getPresignedUrl`                                          | 4     | 미구현     |
| 4    | `generateSummary`, `extractFlaggedTerms`, `generateSlugSuggestions` | 3 | 구현 완료 |
| 5    | `translatePost`, `retrySingleLocale`                       | 3     | 구현 완료  |
| 6    | `saveTranslations`                                         | 4     | 미구현     |
| 7    | `listPosts`, `deletePost`                                  | 4     | 미구현     |
| 8    | `triggerBuild`                                             | 4     | 미구현     |
| 9    | `getPostMetrics` (GA4 연동)                                | 4     | mock       |
| 10   | `listCategories`, `createCategory`, `getCategory`, `updateCategory`, `deleteCategory` | 5 | 미구현 |
