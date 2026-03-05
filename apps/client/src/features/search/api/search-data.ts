/** 검색 페이지에 임베딩할 데이터를 빌드 타임에 생성한다. */

import type { LocalizedPost } from '@/shared/types/post';
import type { Locale } from '@/shared/types/common';
import { CATEGORY_SLUGS } from '@/shared/types/category';
import { getCategoryLabel } from '@/shared/lib/i18n/categories';
import { getLocalePath } from '@/shared/lib/i18n/locales';

export type SearchItem = {
  slug: string;
  title: string;
  description: string;
  category: string;
  subCategory: string;
  thumbnail: string;
  placeName: string | null;
  isSponsored: boolean;
  isRecommended: boolean;
  createdAt: string;
  href: string;
  categoryLabel: string;
  dateStr: string;
};

export type SearchBuildResult = {
  searchData: SearchItem[];
  suggestedKeywords: string[];
};

/**
 * LocalizedPost 배열을 검색용 JSON 데이터와 추천 키워드 목록으로 변환한다.
 * @param posts - locale이 적용된 포스트 목록
 * @param locale - 현재 페이지 locale
 */
export const buildSearchData = (posts: LocalizedPost[], locale: Locale): SearchBuildResult => {
  const searchData: SearchItem[] = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    category: p.category,
    subCategory: p.sub_category,
    thumbnail: p.thumbnail,
    placeName: p.translated_place_name ?? p.place_name,
    isSponsored: p.is_sponsored,
    isRecommended: p.is_recommended,
    createdAt: p.created_at,
    href: getLocalePath(`/${p.category}/${p.sub_category}/${p.slug}/`, locale),
    categoryLabel: getCategoryLabel(p.category, locale),
    dateStr: new Date(p.created_at).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  }));

  const placeNames = [...new Set(
    posts.map((p) => p.translated_place_name ?? p.place_name).filter(Boolean),
  )] as string[];
  const categoryLabels = CATEGORY_SLUGS.map((slug) => getCategoryLabel(slug, locale));
  const suggestedKeywords = [...placeNames, ...categoryLabels];

  return { searchData, suggestedKeywords };
};
