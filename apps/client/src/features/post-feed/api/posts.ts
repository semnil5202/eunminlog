/** 빌드 타임 포스트 조회 API. */

import type { Post } from '@/shared/types/post';
import type { CategorySlug } from '@/shared/types/category';
import { getBuildData } from '@/shared/lib/build-data';
import { subCategoryKey } from '@/shared/lib/build-data-index';

type Filters = {
  category?: CategorySlug;
  subCategory?: string;
  recommended?: boolean;
  multilingual?: boolean;
};

const collectPosts = async (filters: Filters = {}): Promise<Post[]> => {
  const data = await getBuildData();
  const posts = filters.category
    ? filters.subCategory
      ? (data.postsBySubCategory.get(subCategoryKey(filters.category, filters.subCategory)) ?? [])
      : (data.postsByCategory.get(filters.category) ?? [])
    : data.posts;
  return posts.filter(
    (post) =>
      (!filters.recommended || post.is_recommended) &&
      (!filters.multilingual || post.is_multilingual),
  );
};

const paginate = (posts: Post[], page: number, perPage: number) => ({
  posts: posts.slice((page - 1) * perPage, page * perPage),
  totalPages: Math.ceil(posts.length / perPage),
});

export const getAllPosts = (): Promise<Post[]> => collectPosts();

export const getPostsByCategory = (category: CategorySlug): Promise<Post[]> =>
  collectPosts({ category });

export const getPostsBySubCategory = (
  category: CategorySlug,
  subCategory: string,
): Promise<Post[]> => collectPosts({ category, subCategory });

export const getPostBySlug = async (slug: string): Promise<Post | undefined> =>
  (await getBuildData()).postsBySlug.get(slug);

export const getSponsoredPosts = (category?: CategorySlug, subCategory?: string): Promise<Post[]> =>
  collectPosts({ category, subCategory, recommended: true });

export const getMultilingualSponsoredPosts = (
  category?: CategorySlug,
  subCategory?: string,
): Promise<Post[]> =>
  collectPosts({ category, subCategory, recommended: true, multilingual: true });

export const getPostCount = async (): Promise<number> => (await getBuildData()).posts.length;

export const getMultilingualPosts = (): Promise<Post[]> => collectPosts({ multilingual: true });

export const getPaginatedPosts = async (
  page: number,
  perPage = 10,
): Promise<{ posts: Post[]; totalPages: number }> =>
  paginate(await collectPosts({}), page, perPage);

export const getPaginatedPostsByCategory = async (
  category: CategorySlug,
  page: number,
  perPage = 10,
): Promise<{ posts: Post[]; totalPages: number }> =>
  paginate(await collectPosts({ category }), page, perPage);

export const getPaginatedPostsBySubCategory = async (
  category: CategorySlug,
  subCategory: string,
  page: number,
  perPage = 10,
): Promise<{ posts: Post[]; totalPages: number }> =>
  paginate(await collectPosts({ category, subCategory }), page, perPage);

export const getPaginatedMultilingualPosts = async (
  page: number,
  perPage = 10,
): Promise<{ posts: Post[]; totalPages: number }> =>
  paginate(await collectPosts({ multilingual: true }), page, perPage);

export const getPaginatedMultilingualPostsByCategory = async (
  category: CategorySlug,
  page: number,
  perPage = 10,
): Promise<{ posts: Post[]; totalPages: number }> =>
  paginate(await collectPosts({ category, multilingual: true }), page, perPage);

export const getPaginatedMultilingualPostsBySubCategory = async (
  category: CategorySlug,
  subCategory: string,
  page: number,
  perPage = 10,
): Promise<{ posts: Post[]; totalPages: number }> =>
  paginate(await collectPosts({ category, subCategory, multilingual: true }), page, perPage);

const collectSegments = async (category?: CategorySlug, multilingual = false): Promise<Post[]> =>
  (await getBuildData()).postsByIdOrder.filter(
    (post) => (!category || post.category === category) && (!multilingual || post.is_multilingual),
  );

export const getActiveCategorySlugs = async (): Promise<CategorySlug[]> => [
  ...new Set((await collectSegments()).map((post) => post.category)),
];

export const getActiveSubCategorySlugs = async (category: CategorySlug): Promise<string[]> => [
  ...new Set((await collectSegments(category)).map((post) => post.sub_category)),
];

export const getMultilingualCategories = async (): Promise<CategorySlug[]> => [
  ...new Set((await collectSegments(undefined, true)).map((post) => post.category)),
];

export const getMultilingualSubCategories = async (category: CategorySlug): Promise<string[]> => [
  ...new Set((await collectSegments(category, true)).map((post) => post.sub_category)),
];
