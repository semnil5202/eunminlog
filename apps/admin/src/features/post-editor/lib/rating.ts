import { validateProductReviewRating } from '@eunminlog/config/rating';

import type { PostFormValues } from '../types/form';

/** 저장 요청의 평점과 단일 제품 조건을 검증한다.
 * @param values 게시글 폼 값
 */
export function validatePostRating(values: PostFormValues): number | null | undefined {
  return validateProductReviewRating(
    values.rating,
    values.formType === 'product-review',
    Array.isArray(values.products) ? values.products.map((product) => product?.name) : null,
  );
}

/** 이전 임시저장의 누락된 평점을 공란으로 복원한다.
 * @param values 복원할 게시글 폼 값
 */
export function restoreDraftRating(values: PostFormValues): number | null {
  try {
    return validatePostRating(values) ?? null;
  } catch {
    return null;
  }
}
