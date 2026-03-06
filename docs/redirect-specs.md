# 301 Redirect Strategy — Slug 변경 시 이전 URL 리다이렉트

> Date: 2026-03-06
> Status: Draft (PM 작성, 승인 후 se가 구현)

---

## 1. 개요

게시글 또는 카테고리/서브카테고리의 slug가 변경될 때, 이전 URL로 접근하는 사용자와 크롤러를 새 URL로 301 리다이렉트한다. SEO 링크 자산(link equity) 보존과 사용자 경험 유지가 목적이다.

## 2. 리다이렉트 대상

### 2.1 게시글 slug 변경

- 게시글의 `slug`가 변경되면 이전 slug를 `prev_slug`에 저장
- 이력은 **1개만 보관** (직전 slug만 저장, 누적하지 않음)
- slug를 A → B → C로 변경할 경우, `prev_slug`에는 B만 저장됨. A → B 리다이렉트는 소멸

**영향 URL 패턴:**

```
# 한국어 (기본)
/{category}/{sub_category}/{prev_slug} → /{category}/{sub_category}/{new_slug}

# 다국어
/{locale}/{category}/{sub_category}/{prev_slug} → /{locale}/{category}/{sub_category}/{new_slug}
```

### 2.2 카테고리/서브카테고리 slug 변경

- `categories` 테이블의 `slug`가 변경되면 이전 slug를 `prev_slug`에 저장
- 이력은 **1개만 보관**
- 대분류 slug 변경 시 해당 대분류 하위의 모든 URL 경로가 영향을 받음
- 소분류 slug 변경 시 해당 소분류 하위의 포스트 URL 경로가 영향을 받음

**영향 URL 패턴 (대분류 변경):**

```
/{prev_category}/                         → /{new_category}/
/{prev_category}/{sub_category}/          → /{new_category}/{sub_category}/
/{prev_category}/{sub_category}/{slug}    → /{new_category}/{sub_category}/{slug}

# 다국어
/{locale}/{prev_category}/...             → /{locale}/{new_category}/...
```

**영향 URL 패턴 (소분류 변경):**

```
/{category}/{prev_sub}/                   → /{category}/{new_sub}/
/{category}/{prev_sub}/{slug}             → /{category}/{new_sub}/{slug}

# 다국어
/{locale}/{category}/{prev_sub}/...       → /{locale}/{category}/{new_sub}/...
```

## 3. 아키텍처

```
[Admin] slug 변경
  → DB에 prev_slug 저장 + posts 참조값 업데이트 (카테고리 변경 시)
  → GitHub Actions 빌드 트리거
    → Step: 빌드 시 DB에서 리다이렉트 매핑 JSON 생성
    → Step: Astro SSG 빌드 (새 slug 기준 정적 페이지 생성)
    → Step: S3 배포
    → Step: CF Function 코드에 매핑 인라인 삽입 후 업데이트
    → Step: CloudFront 캐시 무효화
```

### 3.1 CloudFront Functions (Viewer Request) 선택 이유

| 옵션               | 장점                         | 단점                           |
| ------------------ | ---------------------------- | ------------------------------ |
| **CF Functions**   | 무료(월 200만 건), 저지연    | 코드 10KB 제한, JS만 가능      |
| Lambda@Edge        | 코드 크기 넉넉, Node.js     | 비용 발생, 콜드 스타트          |
| S3 리다이렉트 규칙 | 설정 간단                    | 50개 제한, 패턴 매칭 유연성 낮음 |
| 별도 리다이렉트 서버 | 제약 없음                  | 인프라 관리 부담, 비용          |

**결론:** 현재 규모(수백 포스트, 카테고리 12개)에서 매핑 데이터는 수 KB 이내이므로 CF Functions가 최적. 이미 URI → index.html 매핑용 CF Function이 존재하므로 해당 함수를 확장한다.

### 3.2 CF Function 코드 구조

기존 CF Function (URI → index.html 매핑)에 리다이렉트 매핑 로직을 추가한다.

```
Viewer Request
  1. 리다이렉트 매핑 확인 → 매칭되면 301 반환
  2. 기존 URI → index.html 매핑 로직 실행
```

**우선순위:** 리다이렉트 체크가 index.html 매핑보다 먼저 실행되어야 함. 이전 slug 경로에 index.html을 매핑하면 404가 되므로.

### 3.3 리다이렉트 매핑 데이터 구조

빌드 시 DB에서 생성하는 JSON:

```typescript
// 게시글 리다이렉트
type PostRedirect = {
  prevSlug: string;
  newSlug: string;
  category: string;
  subCategory: string;
};

// 카테고리 리다이렉트
type CategoryRedirect = {
  prevSlug: string;
  newSlug: string;
  type: 'category' | 'sub_category';
};
```

**CF Function에 인라인할 매핑 오브젝트:**

```javascript
// 빌드 시 자동 생성 — 수동 편집 금지
var POST_REDIRECTS = {
  // "prev_slug": { s: "new_slug", c: "category", sc: "sub_category" }
};

var CATEGORY_REDIRECTS = {
  // "prev_slug": { s: "new_slug", t: "category" | "sub_category" }
};
```

키 이름을 축약(`s`, `c`, `sc`, `t`)하여 10KB 제한 내에서 더 많은 매핑을 수용한다.

### 3.4 CF Function 10KB 제한 대응

| 매핑 규모     | 예상 크기 | 대응 방안                                                  |
| ------------- | --------- | ---------------------------------------------------------- |
| ~50개         | ~2KB      | 인라인으로 충분                                            |
| 50~200개      | ~5KB      | 인라인 가능하나 모니터링 필요                               |
| 200개+        | 10KB 초과 | prev_slug가 NULL인(리다이렉트 불필요) 항목은 제외. 오래된 리다이렉트 정리 정책 도입 |

**정리 정책 (향후):** `prev_slug` 저장 시 `slug_changed_at` 타임스탬프를 함께 기록하고, 일정 기간(예: 6개월) 경과 후 `prev_slug`를 NULL로 정리하는 배치 작업 도입. 현재 규모에서는 불필요.

### 3.5 리다이렉트 매칭 로직 (CF Function)

```
요청 URI 파싱:
  - /{segment1}/{segment2}/{segment3}  (한국어 포스트)
  - /{locale}/{segment1}/{segment2}/{segment3}  (다국어 포스트)

1. 포스트 리다이렉트 확인:
   - URI의 마지막 세그먼트(slug)가 POST_REDIRECTS에 존재하는지 확인
   - 존재하면 slug를 교체한 새 URI로 301 반환

2. 카테고리 리다이렉트 확인:
   - URI의 각 세그먼트가 CATEGORY_REDIRECTS에 존재하는지 확인
   - 존재하면 해당 세그먼트를 교체한 새 URI로 301 반환

3. 매칭 없으면 기존 index.html 매핑 로직으로 진행
```

## 4. DB 변경

### 4.1 `posts` 테이블 — `prev_slug` 컬럼 추가

| Column      | Type           | Description                              |
| ----------- | -------------- | ---------------------------------------- |
| `prev_slug` | text (nullable) | 직전 slug. slug 변경 시 이전 값 저장. NULL이면 변경 이력 없음 |

### 4.2 `categories` 테이블 — `prev_slug` 컬럼 추가

| Column      | Type           | Description                              |
| ----------- | -------------- | ---------------------------------------- |
| `prev_slug` | text (nullable) | 직전 slug. slug 변경 시 이전 값 저장. NULL이면 변경 이력 없음 |

### 4.3 마이그레이션

```sql
-- M-08: posts.prev_slug 추가
ALTER TABLE posts ADD COLUMN prev_slug text;

-- M-09: categories.prev_slug 추가
ALTER TABLE categories ADD COLUMN prev_slug text;
```

## 5. Admin 변경

### 5.1 게시글 수정 — slug 편집 + prev_slug 자동 저장

**현재 상태:** 게시글 수정 페이지(`/posts/[id]/edit`)는 미구현(TODO). slug 자동 생성 + 수동 편집도 미구현.

**변경사항:**

- 게시글 수정 페이지에서 slug 필드를 편집 가능하게 구현
- slug 변경 시 경고 모달 표시:
  - 메시지: "slug 수정 시 기존 경로로 접근할 경우 리다이렉트가 발생하여 크롤러에 영향이 갑니다"
  - 확인/취소 버튼
- `updatePost` Server Action에서 slug 변경 감지 시 기존 slug를 `prev_slug`에 자동 저장

### 5.2 카테고리 수정 — slug 편집 + prev_slug 자동 저장

**현재 상태:** 카테고리 수정 페이지(`/categories/[id]/edit`)는 미구현(TODO). admin-specs.md에 CM-7로 slug 변경 경고 모달 스펙이 이미 정의됨.

**변경사항:**

- 기존 CM-7 스펙 유지 (slug 변경 경고 모달)
- `updateCategory` Server Action에서 slug 변경 감지 시:
  1. 기존 slug를 `prev_slug`에 저장
  2. 해당 카테고리를 참조하는 `posts.category` 또는 `posts.sub_category` 값 일괄 업데이트 (기존 스펙)

### 5.3 API 변경 상세

**`updatePost` — prev_slug 자동 저장 추가:**

```sql
-- slug가 변경된 경우
UPDATE posts
SET slug = :newSlug,
    prev_slug = :oldSlug,
    updated_at = now(),
    ... (기타 변경 필드)
WHERE id = :postId;
```

**`updateCategory` — prev_slug 자동 저장 추가:**

```sql
-- slug가 변경된 경우
UPDATE categories
SET slug = :newSlug,
    prev_slug = :oldSlug,
    name = COALESCE(:name, name),
    sort_order = COALESCE(:sort_order, sort_order),
    updated_at = now()
WHERE id = :categoryId;

-- posts 참조값 업데이트 (기존 스펙, 변경 없음)
-- 대분류인 경우
UPDATE posts SET category = :newSlug WHERE category = :oldSlug;
-- 소분류인 경우
UPDATE posts SET sub_category = :newSlug WHERE sub_category = :oldSlug;
```

## 6. 빌드 파이프라인 변경

GitHub Actions `deploy-client.yml`에 리다이렉트 매핑 생성 + CF Function 업데이트 단계를 추가한다.

### 6.1 추가 Step: 리다이렉트 매핑 생성

빌드 Step과 S3 배포 Step 사이에 삽입:

```
Step 6.5: Generate redirect mappings
  → Supabase에서 prev_slug가 NOT NULL인 posts, categories 조회
  → 매핑 JSON 생성
  → CF Function 소스 코드 템플릿에 매핑 데이터 인라인 삽입
```

**빌드 스크립트 (Node.js):**

1. Supabase에서 리다이렉트 대상 조회:
   ```sql
   SELECT slug, prev_slug, category, sub_category FROM posts WHERE prev_slug IS NOT NULL;
   SELECT slug, prev_slug, parent_id FROM categories WHERE prev_slug IS NOT NULL;
   ```
2. 매핑 오브젝트 생성
3. CF Function 템플릿 파일에 매핑 데이터를 인라인 삽입하여 최종 CF Function 코드 생성

### 6.2 추가 Step: CF Function 업데이트

```
Step 9.5: Update CloudFront Function
  → aws cloudfront update-function (스테이징에 배포)
  → aws cloudfront publish-function (라이브 반영)
```

**필요 IAM 권한 추가:**

```json
{
  "Sid": "CloudFrontFunctionUpdate",
  "Effect": "Allow",
  "Action": [
    "cloudfront:DescribeFunction",
    "cloudfront:UpdateFunction",
    "cloudfront:PublishFunction"
  ],
  "Resource": "*"
}
```

### 6.3 추가 GitHub Secrets

| Secret Name                          | 설명                               |
| ------------------------------------ | ---------------------------------- |
| `PROD_CF_FUNCTION_NAME`             | Production CF Function 이름         |
| `DEV_CF_FUNCTION_NAME`              | Development CF Function 이름        |

Supabase 접속 정보는 기존 `PROD_SUPABASE_URL`, `PROD_SUPABASE_ANON_KEY` (또는 service role key) 사용.

### 6.4 수정된 전체 Step 구조

```
Job: deploy
  ├── Step 1: Checkout
  ├── Step 2: Setup pnpm
  ├── Step 3: Setup Node.js (with pnpm cache)
  ├── Step 4: Install dependencies
  ├── Step 5: Set environment variables (branch-based)
  ├── Step 6: Build client
  ├── Step 7: Generate redirect mappings + CF Function code    ← 신규
  ├── Step 8: Configure AWS credentials
  ├── Step 9: Deploy to S3
  ├── Step 10: Update CloudFront Function                      ← 신규
  ├── Step 11: Invalidate CloudFront cache
  └── (기존 Step 번호 재정렬)
```

## 7. CF Function 템플릿

```
infra/
└── cf-functions/
    └── viewer-request.js.template    # CF Function 템플릿 (매핑 데이터 플레이스홀더 포함)
```

빌드 스크립트가 `__POST_REDIRECTS__`, `__CATEGORY_REDIRECTS__` 플레이스홀더를 실제 매핑 데이터로 치환하여 최종 JS 파일을 생성한다.

## 8. 엣지 케이스

### 8.1 카테고리 + 게시글 slug 동시 변경

카테고리 slug 변경과 게시글 slug 변경이 같은 빌드 사이클에서 발생할 수 있다. CF Function은 카테고리 리다이렉트와 포스트 리다이렉트를 독립적으로 처리하므로 문제 없음.

### 8.2 다중 세그먼트 리다이렉트 (대분류 + 소분류 동시 변경)

대분류와 소분류 slug가 동시에 변경된 경우, CF Function은 URI의 각 세그먼트를 순회하며 매핑을 적용하므로 모든 세그먼트가 올바르게 교체된다.

### 8.3 이전 slug와 다른 엔티티의 현재 slug 충돌

예: 카테고리 A의 `prev_slug = "abc"`, 카테고리 B의 현재 `slug = "abc"`인 경우.
→ CF Function은 `prev_slug`만 체크하므로 현재 slug "abc"로의 정상 접근에는 영향 없음. 단, "abc"로 접근 시 리다이렉트가 발생하여 카테고리 B가 아닌 카테고리 A의 새 slug로 이동하는 문제가 있다.

**대응:** 매핑 생성 시 `prev_slug`가 현재 존재하는 다른 엔티티의 `slug`와 충돌하는 경우 해당 리다이렉트를 제외한다. 빌드 스크립트에서 검증 로직을 추가한다.

### 8.4 prev_slug 소멸 후 접근

slug를 A → B → C로 변경하면 A → B 매핑은 소멸한다. 이전 URL(A 기반)로 접근하면 404가 된다.
→ 이는 의도된 동작. 1개 이력만 보관하는 제약의 trade-off. 중요한 URL이라면 slug 변경을 최소화해야 한다.

## 9. 구현 우선순위

| 순서 | 항목                                            | 의존성        |
| ---- | ----------------------------------------------- | ------------- |
| 1    | DB 마이그레이션 (prev_slug 컬럼 추가)            | 없음          |
| 2    | `updatePost` — prev_slug 자동 저장 로직          | DB 마이그레이션 |
| 3    | `updateCategory` — prev_slug 자동 저장 로직      | DB 마이그레이션 |
| 4    | 게시글 수정 페이지 — slug 편집 UI + 경고 모달     | updatePost    |
| 5    | CF Function 템플릿 작성                          | 없음          |
| 6    | 빌드 스크립트 — 리다이렉트 매핑 생성              | CF 템플릿     |
| 7    | GitHub Actions — CF Function 업데이트 Step 추가   | 빌드 스크립트 |
| 8    | IAM 정책 업데이트 (CF Function 권한)              | 없음          |

## 10. 참조 문서

- [`docs/database.md`](database.md) — DB 스키마 (prev_slug 컬럼)
- [`docs/admin-specs.md`](admin-specs.md) — Admin slug 편집 UI (CM-7, 게시글 수정)
- [`docs/api-specs.md`](api-specs.md) — updatePost, updateCategory API
- [`docs/ci-cd.md`](ci-cd.md) — 빌드 파이프라인 (리다이렉트 매핑 생성 Step)
- [`docs/seo-strategy.md`](seo-strategy.md) — 301 리다이렉트 SEO 전략
