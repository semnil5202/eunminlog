# 자동 번역 기능 복원 가이드

> 자동 번역(GPT-5 Mini API 직접 호출) 기능을 비활성화하고 수동 번역(프롬프트 복사 방식)으로 전환함.
> 자동 번역을 다시 도입할 때 이 문서를 참조.

## 현재 상태

- **자동 번역 feature 파일**: 삭제하지 않음. `features/translation/` 아래 모든 파일 유지
- **페이지 컴포넌트**: `new/page.tsx`, `edit/page.tsx`에서 자동 번역 import/상태/함수/JSX 제거됨
- **수동 번역**: `ManualTranslationSheet` 모달로 대체

## 자동 번역 feature 파일 (삭제하지 않음)

| 파일                                                            | 역할                                   |
| --------------------------------------------------------------- | -------------------------------------- |
| `features/translation/api/client.ts`                            | GPT API 호출 (용어 추출, 번역, 재번역) |
| `features/translation/components/TranslationSheet.tsx`          | 번역 미리보기/편집 모달                |
| `features/translation/containers/TranslationSheetContainer.tsx` | 고유명사 검토 + 번역 실행 모달         |
| `features/translation/hooks/useTranslationDirtyFields.ts`       | 번역 시점 vs 현재 폼 값 비교           |
| `features/translation/hooks/useTranslationCheckState.ts`        | 섹션별 체크박스 상태 관리              |
| `features/translation/lib/html-sections.ts`                     | HTML 섹션 분할/재조립                  |
| `features/translation/lib/merge-selective.ts`                   | 선택적 재번역 결과 머지                |

## 복원 참조 커밋

자동 번역이 페이지에서 정상 동작하던 마지막 커밋:

```
git show 99e8f9a -- apps/admin/src/app/posts/new/page.tsx
git show 99e8f9a -- apps/admin/src/app/posts/[id]/edit/page.tsx
```

이 커밋의 페이지 파일을 참조하여 아래 항목들을 복원하면 됨.

## 복원 시 필요한 작업

### 1. Import 복원 (8개)

```ts
import {
  fetchExtractTerms,
  fetchTranslatePost,
  fetchRetrySingleLocale,
} from '@/features/translation/api/client';
import { LOCALE_FILTER_LABELS } from '@/features/translation/constants/locale';
import { TranslationSheet } from '@/features/translation/components/TranslationSheet';
import { useTranslationDirtyFields } from '@/features/translation/hooks/useTranslationDirtyFields';
import { TranslationSheetContainer } from '@/features/translation/containers/TranslationSheetContainer';
import { mergeSelectiveResult } from '@/features/translation/lib/merge-selective';
```

### 2. 상태 복원 (15개)

`isTranslated`, `isExtracting`, `isSheetOpen`, `isPreviewOpen`, `flaggedTerms`, `translationResults`, `translationError`, `extractionFailed`, `lastConfirmedTerms`, `isRetranslateTermReviewOpen`, `retranslateTermReviewTerms`, `pendingRetranslation`, `translationEditCompleted`, `completedFormSnapshot`, `translationSnapshot`

### 3. 함수 복원 (5개+)

`captureSnapshot`, `handleTranslationStart`, `handleTranslateClick`, `handlePreviewClick`, `handleTranslationComplete`, 재번역 핸들러들

### 4. Hook 복원

`useTranslationDirtyFields` 호출 + `previewDirtyFields`

### 5. JSX 복원

`<TranslationSheetContainer>` 2개, `<TranslationSheet>` 1개, 버튼 3~4개, 에러 메시지

### 6. 유효성 검사 복원

`isTranslated` 기반 검사로 변경, `createPost`/`updatePost`에 `translationResults` 전달

## 알려진 버그 (비활성화 사유)

1. 번역 퀄리티 불안정 — 한국어가 번역 결과에 중간중간 섞여 나옴
2. 일부 문장(태그 단위) 누락 — 실제 데이터에는 있으나 TranslationSheet 미리보기에서 미표시
3. 가격 필드 UI 오류 — 직접 수정 버튼 클릭 시 가격 탭 사라짐
4. 토스트 렌더링 오류 — 간헐적으로 텍스트 없이 배경만 표시
