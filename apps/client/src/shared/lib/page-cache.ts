import {
  getActiveCategorySlugs,
  getActiveSubCategorySlugs,
  getMultilingualCategories,
  getMultilingualSubCategories,
  getPostsBySubCategory,
  getSponsoredPosts,
  getMultilingualSponsoredPosts,
  getPaginatedPostsByCategory,
  getPaginatedPostsBySubCategory,
  getPaginatedMultilingualPosts,
  getPaginatedMultilingualPostsByCategory,
  getPaginatedMultilingualPostsBySubCategory,
} from '@/features/post-feed/api/posts';
import { getLocalizedPost } from '@/features/post-feed/api/translations';
import { DEFAULT_LOCALE, type Locale } from '@/shared/types/common';
import type { LocalizedPost, Post } from '@/shared/types/post';
import { getBuildData, type BuildData } from './build-data';
import { getCategoryTree, getCategoryLabel, getSubCategoryLabel } from './i18n/categories';
import { injectLocalizedBookmarks } from './bookmark';
import { cardCacheModel, hashPageModel, selectNearbyPosts } from './page-cache-model';

const navigationModels = new WeakMap<BuildData, Map<Locale, Promise<string>>>();

const navigationHash = async (locale: Locale): Promise<string> => {
  const snapshot = await getBuildData();
  let byLocale = navigationModels.get(snapshot);
  if (!byLocale) {
    byLocale = new Map();
    navigationModels.set(snapshot, byLocale);
  }
  if (!byLocale.has(locale)) {
    byLocale.set(
      locale,
      (async () => {
        const tree = await getCategoryTree(locale);
        const active =
          locale === DEFAULT_LOCALE
            ? await getActiveCategorySlugs()
            : await getMultilingualCategories();
        const subCategories = await Promise.all(
          active.map(async (category) => [
            category,
            locale === DEFAULT_LOCALE
              ? await getActiveSubCategorySlugs(category)
              : await getMultilingualSubCategories(category),
          ]),
        );
        return hashPageModel({ tree, active, subCategories });
      })(),
    );
  }
  return byLocale.get(locale)!;
};

const sharedModel = async (locale: Locale) => ({
  locale,
  navigation: await navigationHash(locale),
  year: new Date().getFullYear(),
  environment: Object.fromEntries(
    Object.entries(import.meta.env).filter(
      ([key]) =>
        key.startsWith('PUBLIC_') || ['SITE', 'BASE_URL', 'MODE', 'DEV', 'PROD'].includes(key),
    ),
  ),
});

const localizeListPost = (post: Post, locale: Locale): Promise<LocalizedPost> =>
  locale === DEFAULT_LOCALE
    ? Promise.resolve({
        ...post,
        locale,
        image_alts: post.image_alts ?? [],
        translated_place_name: null,
        translated_address: null,
        translated_product_name: null,
        translated_purchase_source: null,
        translated_price_prefix: null,
      })
    : getLocalizedPost(post, locale);

/** 상세 페이지에 표시할 추천·인접 글을 선택한다.
 * @param post 현재 언어가 적용된 글
 * @param locale 출력 언어
 */
export const getPostPageContext = async (post: LocalizedPost, locale: Locale) => {
  const [sponsored, subCategoryPosts] = await Promise.all([
    locale === DEFAULT_LOCALE
      ? getSponsoredPosts(post.category, post.sub_category)
      : getMultilingualSponsoredPosts(post.category, post.sub_category),
    getPostsBySubCategory(post.category, post.sub_category),
  ]);
  return {
    sponsoredLocalized: await Promise.all(
      sponsored.slice(0, 4).map((entry) => getLocalizedPost(entry, locale)),
    ),
    nearbyLocalized: await Promise.all(
      selectNearbyPosts(subCategoryPosts, post.slug).map((entry) =>
        getLocalizedPost(entry, locale),
      ),
    ),
  };
};

/** 상세 페이지가 실제 출력하는 데이터로 캐시 키를 만든다.
 * @param rawPost 원문 글
 * @param locale 출력 언어
 */
export const getPostPageCacheKey = async (rawPost: Post, locale: Locale): Promise<string> => {
  const post = await localizeListPost(rawPost, locale);
  const context = await getPostPageContext(post, locale);
  return hashPageModel({
    shared: await sharedModel(locale),
    post,
    categoryLabel: await getCategoryLabel(post.category, locale),
    subCategoryLabel: await getSubCategoryLabel(post.sub_category, locale),
    bookmarks: await injectLocalizedBookmarks(post.content, locale),
    recommended: context.sponsoredLocalized.map(cardCacheModel),
    nearby: context.nearbyLocalized.map(cardCacheModel),
  });
};

/** 목록 첫 페이지와 추천 카드·언어 선택 상태로 캐시 키를 만든다.
 * @param locale 출력 언어
 * @param category 선택한 대분류
 * @param subCategory 선택한 소분류
 */
export const getListPageCacheKey = async (
  locale: Locale,
  category?: string,
  subCategory?: string,
): Promise<string> => {
  const isDefault = locale === DEFAULT_LOCALE;
  const page =
    category && subCategory
      ? await (isDefault
          ? getPaginatedPostsBySubCategory(category, subCategory, 1)
          : getPaginatedMultilingualPostsBySubCategory(category, subCategory, 1))
      : category
        ? await (isDefault
            ? getPaginatedPostsByCategory(category, 1)
            : getPaginatedMultilingualPostsByCategory(category, 1))
        : await getPaginatedMultilingualPosts(1);
  const sponsored = await (isDefault
    ? getSponsoredPosts(category, subCategory)
    : getMultilingualSponsoredPosts(category, subCategory));
  const cards = await Promise.all(page.posts.map((post) => localizeListPost(post, locale)));
  const recommended = await Promise.all(
    sponsored.slice(0, 4).map((post) => localizeListPost(post, locale)),
  );
  const isMultilingual =
    !isDefault ||
    !category ||
    (subCategory
      ? (await getMultilingualSubCategories(category)).includes(subCategory)
      : (await getMultilingualCategories()).includes(category));
  const homeLabels = !category
    ? await Promise.all(
        (await getActiveCategorySlugs()).map((slug) => getCategoryLabel(slug, locale)),
      )
    : undefined;
  return hashPageModel({
    shared: await sharedModel(locale),
    category,
    subCategory,
    isMultilingual,
    homeLabels,
    categoryLabel: category ? await getCategoryLabel(category, locale) : undefined,
    subCategoryLabel: subCategory ? await getSubCategoryLabel(subCategory, locale) : undefined,
    cards: cards.map(cardCacheModel),
    recommended: recommended.map(cardCacheModel),
    hasNextPage: page.totalPages > 1,
  });
};
