# Database Schema (Supabase PostgreSQL)

> Last updated: 2026-05-26 (is_coupang_partners 칼럼 추가)

DB 스키마, 인덱스, 쿼리 패턴, 스케일링 가이드, 마이그레이션 현황은 [`secrets-reference.md`](secrets-reference.md) 섹션 6~11을 참조한다.

---

## 비즈니스 규칙

### 카테고리 다국어 정합성

`categories` 테이블의 `is_multilingual` 필드에 대한 대분류-소분류 간 정합성 규칙이다.

**규칙**: 대분류(`parent_id IS NULL`)가 `is_multilingual = false`이면, 해당 대분류에 속하는 모든 소분류도 `is_multilingual = false`여야 한다.

| 대분류 `is_multilingual` | 소분류 `is_multilingual` 허용 값 |
| ------------------------ | -------------------------------- |
| `true`                   | `true` 또는 `false`              |
| `false`                  | `false`만 허용                   |

**제어 레벨**: 어플리케이션 레벨 (Admin UI). DB 트리거나 CHECK 제약조건은 없음.

**Admin UI 제어 방식**:

- 소분류 생성 시 (`/categories/new`): 선택한 대분류가 `is_multilingual = false`이면 소분류 다국어 체크박스를 disabled 처리
- 대분류 선택 변경 시: 새 대분류가 다국어 미지원이면 소분류의 다국어 상태를 자동 해제하고 번역 데이터 초기화
- `fetchParentCategories()`가 `is_multilingual` 필드를 함께 반환하여 UI에서 판단 가능

### 쿠팡 파트너스

`posts` 테이블의 `is_coupang_partners boolean NOT NULL DEFAULT false` 칼럼.

- 쿠팡 파트너스 제휴 링크가 포함된 글인지 표시
- 카테고리 제약 없음 (현재 리뷰 카테고리 중심이나, 여행 등 타 카테고리에서도 사용 가능)
- **제어 레벨**: 어플리케이션 레벨 (Admin UI). DB 제약조건 없음
- **Admin UI**: `formType === 'product-review'`일 때 ProductReviewFields 컴포넌트에 체크박스 노출
- **Client 효과**: `true`이면 포스트 상세 페이지에 파트너스 공시 문구 표시, ProductInfoCard 구매 링크에 `rel="sponsored"` 추가, 본문 외부 링크에 `rel="sponsored"` 일괄 주입 (빌드 타임)
