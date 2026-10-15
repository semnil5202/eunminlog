'use server';

import { requireAdmin } from '@/shared/lib/admin-auth';

import { supabaseServer } from '@/shared/lib/supabase-server';

export async function checkSlugDuplicate(
  slug: string,
  table: 'posts' | 'categories',
  excludeId?: string,
): Promise<boolean> {
  await requireAdmin();

  let query = supabaseServer
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { count } = await query;
  return (count ?? 0) > 0;
}
