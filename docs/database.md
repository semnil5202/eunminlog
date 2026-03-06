# Database Schema (Supabase PostgreSQL)

> Last updated: 2026-03-06 (prev_slug 컬럼 추가)

---

## 1. Table: `categories`

카테고리를 DB에서 관리한다. self-referencing `parent_id`로 대분류/소분류를 단일 테이블로 표현한다.

| Column            | Type                       | Description                                                    |
| ----------------- | -------------------------- | -------------------------------------------------------------- |
| `id`              | uuid                       | PK (`gen_random_uuid()`)                                       |
| `slug`            | text (unique)              | URL 경로용 식별자 (`delicious`, `korean`, `hotplace` 등)       |
| `name`            | text                       | 표시명 (한국어: `맛집`, `한식` 등)                             |
| `parent_id`       | uuid (FK → categories.id, nullable) | `NULL`이면 대분류, 값이 있으면 소분류               |
| `sort_order`      | integer (default 0)        | 같은 depth 내 정렬 순서                                        |
| `is_multilingual` | boolean (default `true`)   | 다국어 경로 생성 여부 (소분류 단위)                            |
| `created_at`      | timestamptz                | 생성일 (`now()`)                                               |
| `prev_slug`       | text (nullable)            | 직전 slug. slug 변경 시 이전 값 저장. NULL이면 변경 이력 없음  |
| `updated_at`      | timestamptz                | 수정일 (`now()`)                                               |

**Constraints:**

- `PK(id)`
- `UNIQUE(slug)` — URL 매핑에 사용. 대분류/소분류 slug가 전역 고유해야 함
- `FK(parent_id) REFERENCES categories(id) ON DELETE RESTRICT` — 하위 소분류가 존재하면 대분류 삭제 불가
- `CHECK(parent_id IS NULL OR parent_id != id)` — 자기 참조 방지

**prev_slug 운용 규칙:**

- slug 변경 시 기존 slug를 `prev_slug`에 저장 (application-level)
- 이력은 1개만 보관 (직전 slug만 저장, 누적하지 않음)
- 301 리다이렉트 매핑 생성에 사용 (상세: [`docs/redirect-specs.md`](redirect-specs.md))

**초기 데이터 (Seed):**

| slug          | name | parent_id (slug 기준) | sort_order |
| ------------- | ---- | --------------------- | ---------- |
| delicious     | 맛집 | NULL                  | 0          |
| cafe          | 카페 | NULL                  | 1          |
| travel        | 여행 | NULL                  | 2          |
| korean        | 한식 | delicious             | 0          |
| western       | 양식 | delicious             | 1          |
| japanese      | 일식 | delicious             | 2          |
| pub           | 주점 | delicious             | 3          |
| hotplace      | 핫플 | cafe                  | 0          |
| study         | 카공 | cafe                  | 1          |
| domestic      | 국내 | travel                | 0          |
| overseas      | 해외 | travel                | 1          |
| accommodation | 숙소 | travel                | 2          |

---

## 2. Table: `posts`

| Column            | Type                    | Description                                                                         |
| ----------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| `id`              | uuid                    | PK (`gen_random_uuid()`)                                                            |
| `slug`            | text (unique)           | URL slug                                                                            |
| `title`           | text                    | 게시글 제목                                                                         |
| `description`     | text                    | 요약 설명 (3줄 요약)                                                                |
| `content`         | text                    | 본문 (HTML — Tiptap 에디터 출력)                                                    |
| `category`        | text                    | 대분류 slug (`delicious`, `cafe`, `travel`)                                         |
| `sub_category`    | text                    | 소분류 slug (`korean`, `western`, `hotplace` 등)                                    |
| `thumbnail`       | text                    | 썸네일 이미지 URL (S3 CDN)                                                          |
| `is_sponsored`    | boolean (default false) | 협찬 콘텐츠 여부 (게시글 상세 협찬 고지)                                            |
| `is_recommended`  | boolean (default false) | 추천 콘텐츠 여부 (Right Sidebar / In-Feed Ad)                                       |
| `is_multilingual` | boolean (default true)  | 다국어 콘텐츠 제공 여부. `false`이면 한국어 전용 — 다국어 경로/번역/hreflang 미생성 |
| `rating`          | numeric (1.0 ~ 5.0)    | 평점                                                                                |
| `place_name`      | text                    | 장소명 (Schema.org `itemReviewed`)                                                  |
| `address`         | text                    | 주소 (Schema.org)                                                                   |
| `price_prefix`    | text (nullable)         | 가격 접두어 (예: "메인메뉴 평균: ", "1인 코스: ")                                   |
| `price`           | integer (nullable)      | 가격 (원). `price_prefix + price` 형태로 표시                                       |
| `created_at`      | timestamptz             | 작성일 (`now()`)                                                                    |
| `prev_slug`       | text (nullable)         | 직전 slug. slug 변경 시 이전 값 저장. NULL이면 변경 이력 없음                       |
| `updated_at`      | timestamptz             | 수정일 (`now()`)                                                                    |

**Constraints:**

- `PK(id)`
- `UNIQUE(slug)` — URL lookup
- `CHECK(rating IS NULL OR (rating >= 1.0 AND rating <= 5.0))`

**prev_slug 운용 규칙:**

- slug 변경 시 기존 slug를 `prev_slug`에 저장 (application-level)
- 이력은 1개만 보관 (직전 slug만 저장, 누적하지 않음)
- 301 리다이렉트 매핑 생성에 사용 (상세: [`docs/redirect-specs.md`](redirect-specs.md))

**category/sub_category와 categories 테이블의 관계:**

`posts.category`와 `posts.sub_category`는 `categories.slug`를 참조하지만, **FK 제약을 걸지 않는다.**

- SSG 빌드 시 전체 posts를 일괄 조회하므로 JOIN 없이 단순 SELECT가 최적
- 카테고리 수가 극소(12개)하므로 application-level 검증으로 충분
- FK를 걸면 카테고리 삭제/변경 시 cascade 정책이 복잡해지고, 빌드 성능에 불필요한 overhead 추가

---

## 3. Table: `post_translations`

| Column        | Type                 | Description                                                 |
| ------------- | -------------------- | ----------------------------------------------------------- |
| `id`          | uuid                 | PK (`gen_random_uuid()`)                                    |
| `post_id`     | uuid (FK → posts.id) | 원본 포스트 참조                                            |
| `locale`      | text                 | 언어 코드 (`en`, `ja`, `zh-CN`, `zh-TW`, `id`, `vi`, `th`) |
| `title`       | text                 | 번역된 제목                                                 |
| `description` | text                 | 번역된 요약                                                 |
| `content`     | text                 | 번역된 본문 (HTML)                                          |
| `place_name`  | text (nullable)      | 번역된 장소명                                               |
| `address`     | text (nullable)      | 번역된 주소                                                 |
| `created_at`  | timestamptz          | 번역 생성일 (`now()`)                                       |
| `updated_at`  | timestamptz          | 번역 수정일 (`now()`)                                       |

**Constraints:**

- `PK(id)`
- `UNIQUE(post_id, locale)` — 동일 포스트에 같은 locale 번역은 1개만 허용
- `FK(post_id) REFERENCES posts(id) ON DELETE CASCADE` — 포스트 삭제 시 번역도 자동 삭제

---

## 4. 인덱스 설계

### 설계 원칙

- 실제 쿼리 패턴에 기반한 인덱스만 생성
- 현재 데이터 규모(수백~수천 건)에서 과도한 인덱스는 쓰기 성능만 저하시킴
- partial index로 선택도가 낮은 boolean 컬럼 최적화

### 4.1 posts 인덱스

| 인덱스명                          | 컬럼/조건                                          | 용도                           | 사용 쿼리               |
| --------------------------------- | -------------------------------------------------- | ------------------------------ | ------------------------ |
| `posts_pkey`                      | `(id)` PK                                          | 단건 조회                      | getPost, updatePost      |
| `idx_posts_slug`                  | `(slug)` UNIQUE                                    | URL lookup, SSG 빌드           | SSG getStaticPaths       |
| `idx_posts_created_at_desc`       | `(created_at DESC)`                                | 최신 발행순 목록               | listPosts (sortBy: publishedAt) |
| `idx_posts_updated_at_desc`       | `(updated_at DESC)`                                | 최신 수정순 목록               | listPosts (sortBy: updatedAt)   |
| `idx_posts_category_sub_created`  | `(category, sub_category, created_at DESC)`        | 카테고리 내 최신순 (covering)  | SSG 카테고리 인덱스 빌드 |
| `idx_posts_is_sponsored`          | `(created_at DESC) WHERE is_sponsored = true`      | 협찬 콘텐츠 최신순 (partial)   | Client 협찬 피드         |
| `idx_posts_is_recommended`        | `(created_at DESC) WHERE is_recommended = true`    | 추천 콘텐츠 최신순 (partial)   | Client Right Sidebar     |

**불필요한 인덱스 (현 규모에서 생략):**

- `title` GIN/trigram 인덱스 — 수천 건 이하에서 `ILIKE` seq scan이 GIN보다 빠름. 1만 건 이상 시 `pg_trgm` 확장 + GIN 인덱스 도입 검토
- `is_multilingual` 단독 인덱스 — SSG 빌드에서 전체 조회 후 application-level 필터링이 더 효율적

### 4.2 post_translations 인덱스

| 인덱스명                          | 컬럼/조건                    | 용도                        | 사용 쿼리                |
| --------------------------------- | ---------------------------- | --------------------------- | ------------------------ |
| `post_translations_pkey`          | `(id)` PK                   | 단건 조회                   |                          |
| `idx_translations_post_locale`    | `(post_id, locale)` UNIQUE  | 번역 조회/UPSERT           | getTranslations, saveTranslations |
| `idx_translations_locale`         | `(locale)`                  | locale별 일괄 조회          | SSG 다국어 빌드          |

### 4.3 categories 인덱스

| 인덱스명                  | 컬럼/조건          | 용도                     | 사용 쿼리          |
| ------------------------- | ------------------ | ------------------------ | ------------------ |
| `categories_pkey`         | `(id)` PK         | 단건 조회                |                    |
| `idx_categories_slug`     | `(slug)` UNIQUE   | URL 매핑, 조회           | SSG, Admin         |
| `idx_categories_parent`   | `(parent_id)`     | 대분류 하위 소분류 조회  | listCategories     |

---

## 5. 쿼리 패턴 및 인덱스 매핑

### 5.1 Admin 쿼리

**게시글 목록 (최신 발행순, 기간 필터 + 검색):**

```sql
SELECT id, title, slug, category, sub_category, created_at, updated_at
FROM posts
WHERE created_at BETWEEN :dateFrom AND :dateTo
  AND (:search IS NULL OR title ILIKE '%' || :search || '%')
ORDER BY created_at DESC
LIMIT :pageSize OFFSET (:page - 1) * :pageSize;
```

- 사용 인덱스: `idx_posts_created_at_desc` (range scan + filter)
- 검색어 조건은 인덱스 필터 후 seq filter (현 규모에서 충분)

**게시글 목록 (최신 수정순):**

```sql
SELECT id, title, slug, category, sub_category, created_at, updated_at
FROM posts
WHERE updated_at BETWEEN :dateFrom AND :dateTo
  AND (:search IS NULL OR title ILIKE '%' || :search || '%')
ORDER BY updated_at DESC
LIMIT :pageSize OFFSET (:page - 1) * :pageSize;
```

- 사용 인덱스: `idx_posts_updated_at_desc`

**게시글 총 건수 (페이지네이션):**

```sql
SELECT COUNT(*) FROM posts
WHERE created_at BETWEEN :dateFrom AND :dateTo
  AND (:search IS NULL OR title ILIKE '%' || :search || '%');
```

- 목록 쿼리와 동일 조건. 동일 인덱스 사용

**카테고리 목록 (포함된 글 수 집계):**

```sql
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
GROUP BY c.id
ORDER BY c.parent_id NULLS FIRST, c.sort_order;
```

- 카테고리 12개, posts는 full scan → 현 규모에서 최적화 불필요 (< 10ms)
- 1만 건 이상 시 materialized view 또는 `post_count` 캐시 컬럼 도입 검토

**번역 저장 (UPSERT):**

```sql
INSERT INTO post_translations (post_id, locale, title, description, content, place_name, address)
VALUES (:post_id, :locale, :title, :description, :content, :place_name, :address)
ON CONFLICT (post_id, locale)
DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
  content = EXCLUDED.content, place_name = EXCLUDED.place_name,
  address = EXCLUDED.address, updated_at = now();
```

- 사용 인덱스: `idx_translations_post_locale` (UNIQUE constraint = conflict detection)

### 5.2 SSG 빌드 쿼리 (Client Astro)

**전체 포스트 조회:**

```sql
SELECT * FROM posts ORDER BY created_at DESC;
```

- Full table scan (의도적). SSG 빌드는 전체 데이터 필요

**전체 번역 조회:**

```sql
SELECT * FROM post_translations;
```

- Full table scan. 빌드 타임 1회 실행

**카테고리별 포스트 (SSG 카테고리 인덱스):**

```sql
SELECT * FROM posts
WHERE category = :category AND sub_category = :sub_category
ORDER BY created_at DESC;
```

- 사용 인덱스: `idx_posts_category_sub_created` (covering index, index-only scan 가능)

**협찬/추천 포스트:**

```sql
SELECT * FROM posts WHERE is_sponsored = true ORDER BY created_at DESC;
SELECT * FROM posts WHERE is_recommended = true ORDER BY created_at DESC;
```

- 사용 인덱스: `idx_posts_is_sponsored`, `idx_posts_is_recommended` (partial index, 해당 행만 스캔)

---

## 6. 스케일링 가이드

현재 규모(수백 건)에서는 위 설계로 충분하다. 데이터 성장 시 아래 순서로 대응한다.

| 데이터 규모   | 대응 사항                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------- |
| ~1,000건      | 현 설계 유지. 모든 쿼리 < 10ms                                                                  |
| 1,000~10,000건 | title 검색에 `pg_trgm` GIN 인덱스 도입 검토. OFFSET 페이지네이션 성능 모니터링                |
| 10,000건+     | OFFSET → cursor 기반 페이지네이션 전환. 카테고리별 post_count materialized view 도입            |
| 100,000건+    | posts 테이블 파티셔닝 (created_at range). 읽기 replica 분리 (SSG 빌드용)                       |

---

## 7. 마이그레이션 현황

| ID   | 변경 내용                                                        | 상태   | 비고                                                 |
| ---- | ---------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| M-01 | `posts` 테이블 초기 생성                                         | 완료   | slug, category enum, 기본 컬럼                       |
| M-02 | `post_translations` 테이블 생성                                  | 완료   | place_name, address nullable 컬럼 포함               |
| M-03 | `posts.price_prefix` (text nullable) ADD                         | 미적용 | 기존 `price_min`, `price_max` DROP 포함              |
| M-04 | `posts.price` (integer nullable) ADD                             | 미적용 | M-03과 동시 적용                                     |
| M-05 | `posts.category` enum → text 변환                                | 미적용 | categories 테이블 도입에 따른 유연성 확보            |
| M-06 | `categories` 테이블 생성 + seed 데이터                           | 미적용 | self-referencing parent_id, 초기 12개 카테고리       |
| M-07 | `posts` 인덱스 재설계 (partial index 추가)                       | 미적용 | idx_posts_is_sponsored, idx_posts_is_recommended 등  |
| M-08 | `posts.prev_slug` (text nullable) ADD                            | 미적용 | 301 리다이렉트용 직전 slug 저장                      |
| M-09 | `categories.prev_slug` (text nullable) ADD                       | 미적용 | 301 리다이렉트용 직전 slug 저장                      |
