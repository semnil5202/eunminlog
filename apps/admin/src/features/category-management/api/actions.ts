'use server';

import { supabaseServer } from '@/shared/lib/supabase-server';
import { triggerClientBuild } from '@/features/build-trigger/api/actions';

export type CategoryWithCount = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  is_multilingual: boolean;
  created_at: string;
  post_count: number;
};

export async function fetchCategories(): Promise<CategoryWithCount[]> {
  const { data: categories, error: catError } = await supabaseServer
    .from('categories')
    .select('*')
    .order('parent_id', { nullsFirst: true })
    .order('sort_order');

  if (catError) throw new Error(`카테고리 조회 실패: ${catError.message}`);
  if (!categories) return [];

  const { data: posts, error: postError } = await supabaseServer
    .from('posts')
    .select('category, sub_category');

  if (postError) throw new Error(`게시글 집계 실패: ${postError.message}`);

  const countMap = new Map<string, number>();
  for (const post of posts ?? []) {
    countMap.set(post.category, (countMap.get(post.category) ?? 0) + 1);
    countMap.set(post.sub_category, (countMap.get(post.sub_category) ?? 0) + 1);
  }

  return categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    parent_id: c.parent_id,
    sort_order: c.sort_order,
    is_multilingual: c.is_multilingual,
    created_at: c.created_at,
    post_count: countMap.get(c.slug) ?? 0,
  }));
}

export async function fetchCategory(id: string) {
  const { data, error } = await supabaseServer.from('categories').select('*').eq('id', id).single();

  if (error) throw new Error(`카테고리 조회 실패: ${error.message}`);

  return data as {
    id: string;
    slug: string;
    name: string;
    parent_id: string | null;
    sort_order: number;
    is_multilingual: boolean;
    created_at: string;
  };
}

export async function fetchParentCategories() {
  const { data, error } = await supabaseServer
    .from('categories')
    .select('id, slug, name')
    .is('parent_id', null)
    .order('sort_order');

  if (error) throw new Error(`대분류 조회 실패: ${error.message}`);
  return (data ?? []) as { id: string; slug: string; name: string }[];
}

export type CategoryOption = { value: string; label: string; isMultilingual?: boolean };

export async function fetchCategoryOptions(): Promise<{
  parents: CategoryOption[];
  subMap: Record<string, CategoryOption[]>;
}> {
  const { data, error } = await supabaseServer
    .from('categories')
    .select('id, slug, name, parent_id, is_multilingual')
    .order('sort_order');

  if (error) throw new Error(`카테고리 옵션 조회 실패: ${error.message}`);

  const rows = data ?? [];
  const idToSlug = new Map<string, string>();
  for (const c of rows) idToSlug.set(c.id, c.slug);

  const parents: CategoryOption[] = [];
  const subMap: Record<string, CategoryOption[]> = {};

  for (const c of rows) {
    if (!c.parent_id) {
      parents.push({ value: c.slug, label: c.name });
      subMap[c.slug] = [];
    }
  }

  for (const c of rows) {
    if (c.parent_id) {
      const parentSlug = idToSlug.get(c.parent_id);
      if (parentSlug && subMap[parentSlug]) {
        subMap[parentSlug].push({
          value: c.slug,
          label: c.name,
          isMultilingual: c.is_multilingual,
        });
      }
    }
  }

  return { parents, subMap };
}

export async function createParentCategory(params: {
  name: string;
  slug: string;
  isMultilingual: boolean;
  translations?: Record<string, string>;
}) {
  const { data: maxRow } = await supabaseServer
    .from('categories')
    .select('sort_order')
    .is('parent_id', null)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabaseServer
    .from('categories')
    .insert({
      name: params.name,
      slug: params.slug,
      parent_id: null,
      sort_order: nextSortOrder,
      is_multilingual: params.isMultilingual,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('이미 사용 중인 슬러그입니다.');
    throw new Error(`카테고리 생성 실패: ${error.message}`);
  }

  if (params.isMultilingual && params.translations && Object.keys(params.translations).length > 0) {
    await saveCategoryTranslations(data!.id, params.translations);
  }

  try {
    await triggerClientBuild();
  } catch {
    // silent: 빌드 트리거 실패는 저장 결과에 영향을 주지 않음
  }

  return { id: data!.id as string };
}

async function saveCategoryTranslations(categoryId: string, translations: Record<string, string>) {
  const rows = Object.entries(translations).map(([locale, name]) => ({
    category_id: categoryId,
    locale,
    name,
  }));

  const { error } = await supabaseServer
    .from('category_translations')
    .upsert(rows, { onConflict: 'category_id,locale' });

  if (error) throw new Error(`카테고리 번역 저장 실패: ${error.message}`);
}

export async function createChildCategory(params: {
  parentSlug: string;
  name: string;
  slug: string;
  isMultilingual: boolean;
  translations?: Record<string, string>;
}) {
  const { data: parent, error: parentError } = await supabaseServer
    .from('categories')
    .select('id')
    .eq('slug', params.parentSlug)
    .single();

  if (parentError || !parent) throw new Error('대분류를 찾을 수 없습니다.');

  const { data: maxRow } = await supabaseServer
    .from('categories')
    .select('sort_order')
    .eq('parent_id', parent.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabaseServer
    .from('categories')
    .insert({
      name: params.name,
      slug: params.slug,
      parent_id: parent.id,
      sort_order: nextSortOrder,
      is_multilingual: params.isMultilingual,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('이미 사용 중인 슬러그입니다.');
    throw new Error(`카테고리 생성 실패: ${error.message}`);
  }

  if (params.isMultilingual && params.translations && Object.keys(params.translations).length > 0) {
    await saveCategoryTranslations(data!.id, params.translations);
  }

  try {
    await triggerClientBuild();
  } catch {
    // silent: 빌드 트리거 실패는 저장 결과에 영향을 주지 않음
  }

  return { id: data!.id as string };
}

export async function updateCategory(params: {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
}) {
  const { data: existing, error: fetchError } = await supabaseServer
    .from('categories')
    .select('slug, parent_id')
    .eq('id', params.id)
    .single();

  if (fetchError) throw new Error(`카테고리 조회 실패: ${fetchError.message}`);

  const updateData: Record<string, unknown> = {
    name: params.name,
    slug: params.slug,
    updated_at: new Date().toISOString(),
  };

  if (existing.slug !== params.slug) {
    updateData.prev_slug = existing.slug;
  }

  if (params.parentId) {
    updateData.parent_id = params.parentId;
  }

  const { error: updateError } = await supabaseServer
    .from('categories')
    .update(updateData)
    .eq('id', params.id);

  if (updateError) {
    if (updateError.code === '23505') throw new Error('이미 사용 중인 슬러그입니다.');
    throw new Error(`카테고리 수정 실패: ${updateError.message}`);
  }

  if (existing.slug !== params.slug) {
    const isParent = existing.parent_id === null;
    const column = isParent ? 'category' : 'sub_category';

    await supabaseServer
      .from('posts')
      .update({ [column]: params.slug, updated_at: new Date().toISOString() })
      .eq(column, existing.slug);
  }

  try {
    await triggerClientBuild();
  } catch {
    // silent: 빌드 트리거 실패는 저장 결과에 영향을 주지 않음
  }
}

export async function deleteCategories(ids: string[]) {
  if (ids.length === 0) return { success: false, deletedCount: 0 };

  const { data: categories, error: fetchError } = await supabaseServer
    .from('categories')
    .select('id, slug, parent_id')
    .in('id', ids);

  if (fetchError) throw new Error(`카테고리 조회 실패: ${fetchError.message}`);
  if (!categories?.length) return { success: false, deletedCount: 0 };

  const slugs = categories.map((c) => c.slug);

  const { count: postCount } = await supabaseServer
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .or(`category.in.(${slugs.join(',')}),sub_category.in.(${slugs.join(',')})`);

  if (postCount && postCount > 0) {
    throw new Error('게시글이 포함된 카테고리는 삭제할 수 없습니다.');
  }

  const parentIds = categories.filter((c) => !c.parent_id).map((c) => c.id);
  if (parentIds.length > 0) {
    const { count: childCount } = await supabaseServer
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .in('parent_id', parentIds)
      .not('id', 'in', `(${ids.join(',')})`);

    if (childCount && childCount > 0) {
      throw new Error('하위 소분류가 존재하는 대분류는 삭제할 수 없습니다.');
    }
  }

  const { error, count } = await supabaseServer
    .from('categories')
    .delete({ count: 'exact' })
    .in('id', ids);

  if (error) throw new Error(`카테고리 삭제 실패: ${error.message}`);

  try {
    await triggerClientBuild();
  } catch {
    // silent: 빌드 트리거 실패는 저장 결과에 영향을 주지 않음
  }

  return { success: true, deletedCount: count ?? 0 };
}
