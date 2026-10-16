# Database Schema (Supabase PostgreSQL)

> Last updated: 2026-05-26 (is_coupang_partners 칼럼 추가)

DB 스키마, 인덱스, 쿼리 패턴, 스케일링 가이드, 마이그레이션 현황은 [`secrets-reference.md`](secrets-reference.md) 섹션 6~11을 참조한다.

---

## 비즈니스 규칙

### 단일 제품 리뷰 평점 (2026-10-16, P1, 결정 RATING-01)

- 기존 `posts.rating`을 사용하며 신규 컬럼·테이블을 추가하지 않는다. 운영 DB 조회 결과 `numeric`(precision/scale 지정 없음), nullable, 기본값 `null`, CHECK는 `null` 또는 1~5 범위이다.
- 확인 당시 운영 게시글 48개 중 non-null 평점은 0개였다. 기존 글에 본문 평점이 있어도 자동 이관하지 않고 어드민에서 직접 입력한다.
- 애플리케이션 계약은 `number | null`, 1~5 범위 및 소수 1자리이다. DB CHECK는 소수 자릿수까지 제한하지 않으므로 어드민 폼과 저장 서버에서 함께 검증한다.
- 제품 리뷰 형식이며 유효한 제품명이 정확히 1개인 글에만 점수를 저장한다. 미입력·삭제·대상 변경은 `null`이며, 부적격 대상의 non-null 입력은 서버에서 거부한다.
- `null`은 평점 미입력을 뜻한다. 별도의 활성화 플래그 없이 유효 평점과 단일 제품 조건을 공개 평점 UI·Product/Review JSON-LD의 공통 기준으로 사용한다.
- 평점은 원문 게시글의 공통 값이며 번역 테이블에 복제하지 않는다. 다국어 페이지도 동일 점수를 사용하고 라벨·제품명·canonical만 해당 언어로 표시한다.

### 카테고리 다국어 정합성

`categories` 테이블의 `is_multilingual` 필드에 대한 대분류-소분류 간 정합성 규칙이다.

**규칙**: 대분류(`parent_id IS NULL`)가 `is_multilingual = false`이면, 해당 대분류에 속하는 모든 소분류도 `is_multilingual = false`여야 한다.

| 대분류 `is_multilingual` | 소분류 `is_multilingual` 허용 값 |
| ------------------------ | -------------------------------- |
| `true`                   | `true` 또는 `false`              |
| `false`                  | `false`만 허용                   |

**제어 레벨**: 어플리케이션 레벨 (Admin UI + 카테고리 생성·수정 Server Action). DB 트리거나 CHECK 제약조건은 없음.

**Admin UI 제어 방식**:

- 소분류 생성 시 (`/categories/new`): 선택한 대분류가 `is_multilingual = false`이면 소분류 다국어 체크박스를 disabled 처리
- 대분류 선택 변경 시: 새 대분류가 다국어 미지원이면 소분류의 다국어 상태를 자동 해제하고 번역 데이터 초기화
- `fetchParentCategories()`가 `is_multilingual` 필드를 함께 반환하여 UI에서 판단 가능
- 소분류 생성·대분류 변경을 저장할 때 서버가 대상이 실제 대분류인지 확인하고, 다국어 미지원 대분류 아래에 다국어 지원 소분류가 놓이지 않도록 검증
- 소분류에 글이 있으면 대분류 변경을 거부하여 기존 글의 `posts.category`와 소분류 소속이 달라지지 않게 함

### 쿠팡 파트너스

`posts` 테이블의 `is_coupang_partners boolean NOT NULL DEFAULT false` 칼럼.

- 쿠팡 파트너스 제휴 링크가 포함된 글인지 표시
- 카테고리 제약 없음 (현재 리뷰 카테고리 중심이나, 여행 등 타 카테고리에서도 사용 가능)
- **제어 레벨**: 어플리케이션 레벨 (Admin UI). DB 제약조건 없음
- **Admin UI**: `formType === 'product-review'`일 때 ProductReviewFields 컴포넌트에 체크박스 노출
- **Client 효과**: `true`이면 포스트 상세 페이지에 파트너스 공시 문구 표시, ProductInfoCard 구매 링크에 `rel="sponsored"` 추가, 본문 외부 링크에 `rel="sponsored"` 일괄 주입 (빌드 타임)
