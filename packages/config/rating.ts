/** 1~5 범위의 소수 한 자리 평점인지 확인한다.
 * @param value 검사할 평점
 */
export function isValidRating(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 1 &&
    value <= 5 &&
    Math.abs(value * 10 - Math.round(value * 10)) < 1e-9
  );
}

/** 유효한 제품명이 정확히 하나일 때 해당 이름을 반환한다.
 * @param names 제품명 목록
 */
export function getSingleProductName(names: readonly string[] | null | undefined): string | null {
  if (!Array.isArray(names)) return null;
  const validNames = names
    .filter((name) => typeof name === 'string' && name.trim())
    .map((name) => name.trim());
  return validNames.length === 1 ? validNames[0]! : null;
}

/** 제품 리뷰의 평점 입력을 검증하고 미입력 값을 정규화한다.
 * @param rating 요청에 포함된 평점
 * @param isProductReview 제품 리뷰 폼 여부
 * @param productNames 제품명 목록
 */
export function validateProductReviewRating(
  rating: unknown,
  isProductReview: boolean,
  productNames: readonly string[] | null | undefined,
): number | null | undefined {
  const canRate = isProductReview && getSingleProductName(productNames) !== null;
  if (rating === undefined) return canRate ? undefined : null;
  if (rating === null) return null;
  if (!isValidRating(rating)) {
    throw new Error('평점은 1~5 사이에서 소수 한 자리까지 입력해주세요.');
  }
  if (!canRate) throw new Error('평점은 단일 제품 리뷰에서만 입력할 수 있습니다.');
  return rating;
}
