# Database Schema (Supabase PostgreSQL)

## Table: `posts`

| Column           | Type                                 | Description                                   |
| ---------------- | ------------------------------------ | --------------------------------------------- |
| `id`             | uuid                                 | PK                                            |
| `slug`           | text (unique)                        | URL slug                                      |
| `title`          | text                                 | 게시글 제목                                   |
| `description`    | text                                 | 요약 설명                                     |
| `content`        | text                                 | 본문 (HTML — Tiptap 에디터 출력)              |
| `category`       | enum (`delicious`, `cafe`, `travel`) | 대분류                                        |
| `sub_category`   | text                                 | 소분류 (한식, 양식, 핫플 등)                  |
| `thumbnail`      | text                                 | 썸네일 이미지 URL                             |
| `is_sponsored`   | boolean                              | 협찬 콘텐츠 여부 (게시글 상세 협찬 고지)      |
| `is_recommended` | boolean                              | 추천 콘텐츠 여부 (Right Sidebar / In-Feed Ad) |
| `is_multilingual`| boolean (default `true`)             | 다국어 콘텐츠 제공 여부. `false`이면 한국어 전용 — 다국어 경로/번역/hreflang 미생성 |
| `rating`         | numeric (1.0 ~ 5.0)                  | 평점                                          |
| `place_name`     | text                                 | 장소명 (Schema.org `itemReviewed`)            |
| `address`        | text                                 | 주소 (Schema.org)                             |
| `price_level`    | text                                 | 가격대                                        |
| `created_at`     | timestamptz                          | 작성일                                        |
| `updated_at`     | timestamptz                          | 수정일                                        |

## Table: `post_translations`

| Column        | Type                 | Description                                          |
| ------------- | -------------------- | ---------------------------------------------------- |
| `id`          | uuid                 | PK                                                   |
| `post_id`     | uuid (FK → posts.id) | 원본 포스트 참조                                     |
| `locale`      | text                 | 언어 코드 (`en`, `ja`, `zh-CN`, `zh-TW`, `id`, `vi`) |
| `title`       | text                 | 번역된 제목                                          |
| `description` | text                 | 번역된 요약                                          |
| `content`     | text                 | 번역된 본문 (HTML)                                   |
| `created_at`  | timestamptz          | 번역 생성일                                          |
| `updated_at`  | timestamptz          | 번역 수정일                                          |

**Constraints**: `UNIQUE(post_id, locale)`

## Index Recommendations

- `slug` — unique index (URL lookup)
- `category` — filter/sort 용도
- `category, sub_category` — compound index (카테고리 필터링)
- `is_sponsored` — 협찬 콘텐츠 조회
- `is_recommended` — 추천 콘텐츠 조회
- `is_multilingual` — 다국어 지원 포스트 필터링
- `created_at` — 최신순 정렬
- `post_translations(post_id, locale)` — unique compound index (번역 조회)
