'use server';

import { supabaseServer } from '@/shared/lib/supabase-server';

export async function deletePosts(ids: string[]) {
  if (ids.length === 0) return { success: false, deletedCount: 0 };

  const { error, count } = await supabaseServer
    .from('posts')
    .delete({ count: 'exact' })
    .in('id', ids);

  if (error) throw new Error(`게시글 삭제 실패: ${error.message}`);

  return { success: true, deletedCount: count ?? 0 };
}
