# Database Schema (Supabase PostgreSQL)

> Last updated: 2026-03-09 (제품 리뷰 필드 배열 변환 M-17, 카테고리 다국어 정합성 비즈니스 규칙)

DB 스키마, 인덱스, 쿼리 패턴, 스케일링 가이드, 마이그레이션 현황은 [`secrets-reference.md`](secrets-reference.md) 섹션 6~11을 참조한다.

---

## 비즈니스 규칙

### 카테고리 다국어 정합성

`categories` 테이블의 `is_multilingual` 필드에 대한 대분류-소분류 간 정합성 규칙이다.

**규칙**: 대분류(`parent_id IS NULL`)가 `is_multilingual = false`이면, 해당 대분류에 속하는 모든 소분류도 `is_multilingual = false`여야 한다.

| 대분류 `is_multilingual` | 소분류 `is_multilingual` 허용 값 |
| ------------------------ | -------------------------------- |
| `true`                   | `true` 또는 `false`             |
| `false`                  | `false`만 허용                   |

**제어 레벨**: 어플리케이션 레벨 (Admin UI). DB 트리거나 CHECK 제약조건은 없음.

**Admin UI 제어 방식**:

- 소분류 생성 시 (`/categories/new`): 선택한 대분류가 `is_multilingual = false`이면 소분류 다국어 체크박스를 disabled 처리
- 대분류 선택 변경 시: 새 대분류가 다국어 미지원이면 소분류의 다국어 상태를 자동 해제하고 번역 데이터 초기화
- `fetchParentCategories()`가 `is_multilingual` 필드를 함께 반환하여 UI에서 판단 가능
