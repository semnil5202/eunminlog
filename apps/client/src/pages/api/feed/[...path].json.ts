/** 빌드 타임 피드 JSON 엔드포인트. 무한스크롤 Page 2+ 데이터를 정적 JSON으로 생성한다. */

import type { APIRoute, GetStaticPaths } from 'astro';
import { type Locale, LOCALES, DEFAULT_LOCALE } from '@/shared/types/common';
import type { CategorySlug } from '@/shared/types/category';
import { fetchSubCategoryMap } from '@/features/post-feed/api/categories';
import {
  getPaginatedPosts,
  getPaginatedPostsByCategory,
  getPaginatedPostsBySubCategory,
  getPaginatedMultilingualPosts,
  getPaginatedMultilingualPostsByCategory,
  getPaginatedMultilingualPostsBySubCategory,
} from '@/features/post-feed/api/posts';
import { getLocalizedPost } from '@/features/post-feed/api/translations';
import { getLocalePath } from '@/shared/lib/i18n/locales';
import { getCategoryLabel } from '@/shared/lib/i18n/categories';
import { t } from '@/shared/lib/i18n/translations';
import type { Post } from '@/shared/types/post';

type FeedPostData = {
  title: string;
  description: string;
  thumbnail: string;
  thumbnailAlt: string;
  href: string;
  categoryLabel: string;
  dateStr: string;
  placeName: string | null;
  isSponsored: boolean;
  isRecommended: boolean;
  sponsoredLabel: string;
};

type PathProps = {
  locale: Locale;
  category: CategorySlug | null;
  subCategory: string | null;
  page: number;
  [key: string]: unknown;
};

const buildFeedPostData = async (post: Post, locale: Locale): Promise<FeedPostData> => {
  const localized = await getLocalizedPost(post, locale);
  const postPath = `/${post.category}/${post.sub_category}/${post.slug}/`;

  return {
    title: localized.title,
    description: localized.description,
    thumbnail: post.thumbnail,
    thumbnailAlt: localized.thumbnail_alt ?? localized.title,
    href: getLocalePath(postPath, locale),
    categoryLabel: await getCategoryLabel(post.category, locale),
    dateStr: new Date(post.created_at).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    placeName: localized.translated_place_name ?? post.place_name ?? null,
    isSponsored: post.is_sponsored,
    isRecommended: post.is_recommended,
    sponsoredLabel: t('post.sponsoredBadge', locale),
  };
};

const fetchPage = async (
  category: CategorySlug | null,
  subCategory: string | null,
  page: number,
  locale: Locale,
) => {
  const isDefault = locale === DEFAULT_LOCALE;
  if (category && subCategory) {
    return isDefault
      ? getPaginatedPostsBySubCategory(category, subCategory, page)
      : getPaginatedMultilingualPostsBySubCategory(category, subCategory, page);
  }
  if (category) {
    return isDefault
      ? getPaginatedPostsByCategory(category, page)
      : getPaginatedMultilingualPostsByCategory(category, page);
  }
  return isDefault ? getPaginatedPosts(page) : getPaginatedMultilingualPosts(page);
};

export const getStaticPaths: GetStaticPaths = async () => {
  const paths: { params: { path: string }; props: PathProps }[] = [];
  const subCategoryMap = await fetchSubCategoryMap();

  for (const locale of LOCALES) {
    const isDefault = locale === DEFAULT_LOCALE;

    const { totalPages: allTotal } = isDefault
      ? await getPaginatedPosts(1)
      : await getPaginatedMultilingualPosts(1);
    for (let page = 2; page <= allTotal; page++) {
      paths.push({
        params: { path: `${locale}/all/${page}` },
        props: { locale, category: null, subCategory: null, page },
      });
    }

    for (const [category, subCategories] of Object.entries(subCategoryMap)) {
      const { totalPages: catTotal } = isDefault
        ? await getPaginatedPostsByCategory(category as CategorySlug, 1)
        : await getPaginatedMultilingualPostsByCategory(category as CategorySlug, 1);
      for (let page = 2; page <= catTotal; page++) {
        paths.push({
          params: { path: `${locale}/${category}/${page}` },
          props: { locale, category: category as CategorySlug, subCategory: null, page },
        });
      }

      for (const sub of subCategories) {
        const { totalPages: subTotal } = isDefault
          ? await getPaginatedPostsBySubCategory(category as CategorySlug, sub, 1)
          : await getPaginatedMultilingualPostsBySubCategory(category as CategorySlug, sub, 1);
        for (let page = 2; page <= subTotal; page++) {
          paths.push({
            params: { path: `${locale}/${category}/${sub}/${page}` },
            props: { locale, category: category as CategorySlug, subCategory: sub, page },
          });
        }
      }
    }
  }

  return paths;
};

export const GET: APIRoute = async ({ props }) => {
  const { locale, category, subCategory, page } = props as PathProps;

  const { posts, totalPages } = await fetchPage(category, subCategory, page, locale);

  const feedPosts = await Promise.all(posts.map((post) => buildFeedPostData(post, locale)));

  return new Response(
    JSON.stringify({
      posts: feedPosts,
      hasNext: page < totalPages,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
