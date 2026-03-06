/** 빌드 타임 포스트 쿼리 API. Supabase PostgreSQL 기반. */

import type { Post } from '@/shared/types/post';
import type { CategorySlug } from '@/shared/types/category';
import { supabase } from '@/shared/lib/supabase';

const POST_COLUMNS =
  'id, slug, title, description, content, category, sub_category, thumbnail, is_sponsored, is_recommended, is_multilingual, rating, place_name, address, price_prefix, price, image_alts, created_at, updated_at';

export const getAllPosts = async (): Promise<Post[]> => {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getAllPosts failed: ${error.message}`);
  return data as Post[];
};

export const getPostsByCategory = async (category: CategorySlug): Promise<Post[]> => {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getPostsByCategory failed: ${error.message}`);
  return data as Post[];
};

export const getPostsBySubCategory = async (
  category: CategorySlug,
  subCategory: string,
): Promise<Post[]> => {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('category', category)
    .eq('sub_category', subCategory)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getPostsBySubCategory failed: ${error.message}`);
  return data as Post[];
};

export const getPostBySlug = async (slug: string): Promise<Post | undefined> => {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`getPostBySlug failed: ${error.message}`);
  return (data as Post) ?? undefined;
};

export const getSponsoredPosts = async (
  category?: CategorySlug,
  subCategory?: string,
): Promise<Post[]> => {
  let query = supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('is_recommended', true);

  if (category) query = query.eq('category', category);
  if (category && subCategory) query = query.eq('sub_category', subCategory);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw new Error(`getSponsoredPosts failed: ${error.message}`);
  return data as Post[];
};

export const getMultilingualSponsoredPosts = async (
  category?: CategorySlug,
  subCategory?: string,
): Promise<Post[]> => {
  let query = supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('is_recommended', true)
    .eq('is_multilingual', true);

  if (category) query = query.eq('category', category);
  if (category && subCategory) query = query.eq('sub_category', subCategory);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw new Error(`getMultilingualSponsoredPosts failed: ${error.message}`);
  return data as Post[];
};

export const getPostCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true });

  if (error) throw new Error(`getPostCount failed: ${error.message}`);
  return count ?? 0;
};

export const getMultilingualPosts = async (): Promise<Post[]> => {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('is_multilingual', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getMultilingualPosts failed: ${error.message}`);
  return data as Post[];
};

export const getPaginatedMultilingualPosts = async (
  page: number,
  perPage = 9,
): Promise<{ posts: Post[]; totalPages: number }> => {
  const from = (page - 1) * perPage;

  const { count, error: countError } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('is_multilingual', true);

  if (countError) throw new Error(`getPaginatedMultilingualPosts count failed: ${countError.message}`);

  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('is_multilingual', true)
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (error) throw new Error(`getPaginatedMultilingualPosts failed: ${error.message}`);

  return {
    posts: data as Post[],
    totalPages: Math.ceil((count ?? 0) / perPage),
  };
};

export const getPaginatedMultilingualPostsByCategory = async (
  category: CategorySlug,
  page: number,
  perPage = 9,
): Promise<{ posts: Post[]; totalPages: number }> => {
  const from = (page - 1) * perPage;

  const { count, error: countError } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('is_multilingual', true)
    .eq('category', category);

  if (countError) throw new Error(`getPaginatedMultilingualPostsByCategory count failed: ${countError.message}`);

  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('is_multilingual', true)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (error) throw new Error(`getPaginatedMultilingualPostsByCategory failed: ${error.message}`);

  return {
    posts: data as Post[],
    totalPages: Math.ceil((count ?? 0) / perPage),
  };
};

export const getPaginatedMultilingualPostsBySubCategory = async (
  category: CategorySlug,
  subCategory: string,
  page: number,
  perPage = 9,
): Promise<{ posts: Post[]; totalPages: number }> => {
  const from = (page - 1) * perPage;

  const { count, error: countError } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('is_multilingual', true)
    .eq('category', category)
    .eq('sub_category', subCategory);

  if (countError) throw new Error(`getPaginatedMultilingualPostsBySubCategory count failed: ${countError.message}`);

  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('is_multilingual', true)
    .eq('category', category)
    .eq('sub_category', subCategory)
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (error) throw new Error(`getPaginatedMultilingualPostsBySubCategory failed: ${error.message}`);

  return {
    posts: data as Post[],
    totalPages: Math.ceil((count ?? 0) / perPage),
  };
};

export const getPaginatedPosts = async (
  page: number,
  perPage = 9,
): Promise<{ posts: Post[]; totalPages: number }> => {
  const from = (page - 1) * perPage;

  const { count, error: countError } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true });

  if (countError) throw new Error(`getPaginatedPosts count failed: ${countError.message}`);

  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (error) throw new Error(`getPaginatedPosts failed: ${error.message}`);

  return {
    posts: data as Post[],
    totalPages: Math.ceil((count ?? 0) / perPage),
  };
};

export const getPaginatedPostsByCategory = async (
  category: CategorySlug,
  page: number,
  perPage = 9,
): Promise<{ posts: Post[]; totalPages: number }> => {
  const from = (page - 1) * perPage;

  const { count, error: countError } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('category', category);

  if (countError) throw new Error(`getPaginatedPostsByCategory count failed: ${countError.message}`);

  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (error) throw new Error(`getPaginatedPostsByCategory failed: ${error.message}`);

  return {
    posts: data as Post[],
    totalPages: Math.ceil((count ?? 0) / perPage),
  };
};

export const getPaginatedPostsBySubCategory = async (
  category: CategorySlug,
  subCategory: string,
  page: number,
  perPage = 9,
): Promise<{ posts: Post[]; totalPages: number }> => {
  const from = (page - 1) * perPage;

  const { count, error: countError } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('category', category)
    .eq('sub_category', subCategory);

  if (countError) throw new Error(`getPaginatedPostsBySubCategory count failed: ${countError.message}`);

  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('category', category)
    .eq('sub_category', subCategory)
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (error) throw new Error(`getPaginatedPostsBySubCategory failed: ${error.message}`);

  return {
    posts: data as Post[],
    totalPages: Math.ceil((count ?? 0) / perPage),
  };
};

export const getMultilingualCategories = async (): Promise<CategorySlug[]> => {
  const { data, error } = await supabase
    .from('posts')
    .select('category')
    .eq('is_multilingual', true);

  if (error) throw new Error(`getMultilingualCategories failed: ${error.message}`);

  const categorySet = new Set((data as { category: string }[]).map((p) => p.category));
  return Array.from(categorySet) as CategorySlug[];
};

export const getMultilingualSubCategories = async (category: CategorySlug): Promise<string[]> => {
  const { data, error } = await supabase
    .from('posts')
    .select('sub_category')
    .eq('is_multilingual', true)
    .eq('category', category);

  if (error) throw new Error(`getMultilingualSubCategories failed: ${error.message}`);

  const subCategorySet = new Set((data as { sub_category: string }[]).map((p) => p.sub_category));
  return Array.from(subCategorySet);
};
