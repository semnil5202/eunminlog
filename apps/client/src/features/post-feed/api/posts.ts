/** 빌드 타임 포스트 쿼리 API. Mock 데이터 기반이며 Supabase 마이그레이션 시 함수 시그니처는 유지한다. */

import type { Post } from '@/shared/types/post';
import type { CategorySlug } from '@/shared/types/category';
import { MOCK_POSTS } from '@/features/post-feed/mock/posts';

/** Stable newest-first sort. Operates on a shallow copy to avoid mutation. */
const sortByDateDesc = (posts: Post[]): Post[] =>
  [...posts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

/** Returns all posts sorted newest-first. */
export const getAllPosts = async (): Promise<Post[]> => sortByDateDesc(MOCK_POSTS);

/** Returns all posts in a top-level category, sorted newest-first. */
export const getPostsByCategory = async (category: CategorySlug): Promise<Post[]> => {
  const filtered = MOCK_POSTS.filter((p) => p.category === category);
  return sortByDateDesc(filtered);
};

/** Returns posts in a specific sub-category, sorted newest-first. */
export const getPostsBySubCategory = async (
  category: CategorySlug,
  subCategory: string,
): Promise<Post[]> => {
  const filtered = MOCK_POSTS.filter(
    (p) => p.category === category && p.sub_category === subCategory,
  );
  return sortByDateDesc(filtered);
};

/**
 * Looks up a single post by its URL slug.
 * Returns `undefined` when no match is found (caller decides how to 404).
 */
export const getPostBySlug = async (slug: string): Promise<Post | undefined> =>
  MOCK_POSTS.find((p) => p.slug === slug);

/**
 * Returns sponsored posts sorted newest-first (Right Sidebar / In-Feed Ad).
 *
 * @param category     Optional top-level category filter.
 * @param subCategory  Optional sub-category filter (requires category).
 */
export const getSponsoredPosts = async (
  category?: CategorySlug,
  subCategory?: string,
): Promise<Post[]> => {
  let filtered = MOCK_POSTS.filter((p) => p.is_sponsored);
  if (category) filtered = filtered.filter((p) => p.category === category);
  if (category && subCategory) filtered = filtered.filter((p) => p.sub_category === subCategory);
  return sortByDateDesc(filtered);
};

/**
 * Returns sponsored multilingual posts sorted newest-first (Right Sidebar on locale pages).
 *
 * @param category     Optional top-level category filter.
 * @param subCategory  Optional sub-category filter (requires category).
 */
export const getMultilingualSponsoredPosts = async (
  category?: CategorySlug,
  subCategory?: string,
): Promise<Post[]> => {
  let filtered = MOCK_POSTS.filter((p) => p.is_sponsored && p.is_multilingual);
  if (category) filtered = filtered.filter((p) => p.category === category);
  if (category && subCategory) filtered = filtered.filter((p) => p.sub_category === subCategory);
  return sortByDateDesc(filtered);
};

/** Returns Editor's Pick posts sorted newest-first (Right Sidebar). */
export const getRecommendedPosts = async (): Promise<Post[]> => {
  const filtered = MOCK_POSTS.filter((p) => p.is_recommended);
  return sortByDateDesc(filtered);
};

/** Returns the total number of published posts. */
export const getPostCount = async (): Promise<number> => MOCK_POSTS.length;

/** Returns all posts that support multilingual content. */
export const getMultilingualPosts = async (): Promise<Post[]> =>
  sortByDateDesc(MOCK_POSTS.filter((p) => p.is_multilingual));

/**
 * Returns a page of multilingual posts across all categories.
 *
 * @param page    1-based page number.
 * @param perPage Posts per page. Defaults to 9.
 */
export const getPaginatedMultilingualPosts = async (
  page: number,
  perPage = 9,
): Promise<{ posts: Post[]; totalPages: number }> => {
  const sorted = sortByDateDesc(MOCK_POSTS.filter((p) => p.is_multilingual));
  const totalPages = Math.ceil(sorted.length / perPage);
  const from = (page - 1) * perPage;
  const posts = sorted.slice(from, from + perPage);
  return { posts, totalPages };
};

/**
 * Returns a page of multilingual posts within a top-level category.
 *
 * @param page    1-based page number.
 * @param perPage Posts per page. Defaults to 9.
 */
export const getPaginatedMultilingualPostsByCategory = async (
  category: CategorySlug,
  page: number,
  perPage = 9,
): Promise<{ posts: Post[]; totalPages: number }> => {
  const sorted = sortByDateDesc(
    MOCK_POSTS.filter((p) => p.category === category && p.is_multilingual),
  );
  const totalPages = Math.ceil(sorted.length / perPage);
  const from = (page - 1) * perPage;
  const posts = sorted.slice(from, from + perPage);
  return { posts, totalPages };
};

/**
 * Returns a page of multilingual posts within a specific sub-category.
 *
 * @param page    1-based page number.
 * @param perPage Posts per page. Defaults to 9.
 */
export const getPaginatedMultilingualPostsBySubCategory = async (
  category: CategorySlug,
  subCategory: string,
  page: number,
  perPage = 9,
): Promise<{ posts: Post[]; totalPages: number }> => {
  const sorted = sortByDateDesc(
    MOCK_POSTS.filter(
      (p) => p.category === category && p.sub_category === subCategory && p.is_multilingual,
    ),
  );
  const totalPages = Math.ceil(sorted.length / perPage);
  const from = (page - 1) * perPage;
  const posts = sorted.slice(from, from + perPage);
  return { posts, totalPages };
};

/**
 * Returns a page of posts across all categories.
 *
 * @param page    1-based page number.
 * @param perPage Posts per page. Defaults to 9 (matches 3-column grid).
 */
export const getPaginatedPosts = async (
  page: number,
  perPage = 9,
): Promise<{ posts: Post[]; totalPages: number }> => {
  const sorted = sortByDateDesc(MOCK_POSTS);
  const totalPages = Math.ceil(sorted.length / perPage);
  const from = (page - 1) * perPage;
  const posts = sorted.slice(from, from + perPage);
  return { posts, totalPages };
};

/**
 * Returns a page of posts within a top-level category.
 *
 * @param page    1-based page number.
 * @param perPage Posts per page. Defaults to 9.
 */
export const getPaginatedPostsByCategory = async (
  category: CategorySlug,
  page: number,
  perPage = 9,
): Promise<{ posts: Post[]; totalPages: number }> => {
  const sorted = sortByDateDesc(MOCK_POSTS.filter((p) => p.category === category));
  const totalPages = Math.ceil(sorted.length / perPage);
  const from = (page - 1) * perPage;
  const posts = sorted.slice(from, from + perPage);
  return { posts, totalPages };
};

/**
 * Returns a page of posts within a specific sub-category.
 *
 * @param page    1-based page number.
 * @param perPage Posts per page. Defaults to 9.
 */
export const getPaginatedPostsBySubCategory = async (
  category: CategorySlug,
  subCategory: string,
  page: number,
  perPage = 9,
): Promise<{ posts: Post[]; totalPages: number }> => {
  const sorted = sortByDateDesc(
    MOCK_POSTS.filter((p) => p.category === category && p.sub_category === subCategory),
  );
  const totalPages = Math.ceil(sorted.length / perPage);
  const from = (page - 1) * perPage;
  const posts = sorted.slice(from, from + perPage);
  return { posts, totalPages };
};
