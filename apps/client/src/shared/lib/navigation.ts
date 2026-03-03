/** URL pathname에서 현재 활성 카테고리/서브카테고리를 추출한다. */

import { CATEGORY_SLUGS, type CategorySlug } from '@/shared/types/category';
import { DEFAULT_LOCALE, type Locale } from '@/shared/types/common';

/**
 * pathname과 locale을 기반으로 활성 카테고리와 서브카테고리를 반환한다.
 * @param pathname - 현재 페이지 URL pathname
 * @param locale - 현재 페이지 locale
 */
export const getActiveSegments = (
  pathname: string,
  locale: Locale,
): {
  activeCategory: CategorySlug | null;
  activeSubCategory: string | null;
} => {
  const segments = pathname.split('/').filter(Boolean);
  if (locale !== DEFAULT_LOCALE && segments[0] === locale) segments.shift();
  const activeCategory = CATEGORY_SLUGS.includes(segments[0] as CategorySlug)
    ? (segments[0] as CategorySlug)
    : null;
  const activeSubCategory = activeCategory && segments[1] ? segments[1] : null;
  return { activeCategory, activeSubCategory };
};
