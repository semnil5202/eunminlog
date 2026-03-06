'use server';

import { supabaseServer } from '@/shared/lib/supabase-server';

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

  return { success: true, deletedCount: count ?? 0 };
}
