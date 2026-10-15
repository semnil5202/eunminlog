import { NextResponse } from 'next/server';

import { getAdminAccess } from '@/shared/lib/admin-auth';
import { supabaseServer } from '@/shared/lib/supabase-server';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** GET /api/drafts/[id] — 단일 임시저장 불러오기 */
export async function GET(_request: Request, { params }: Params) {
  const access = await getAdminAccess();
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? '인증이 필요합니다.' : '관리자 권한이 필요합니다.' },
      { status: access.status },
    );
  }

  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('post_drafts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ draft: data });
}

/** DELETE /api/drafts/[id] — 임시저장 삭제 */
export async function DELETE(_request: Request, { params }: Params) {
  const access = await getAdminAccess();
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? '인증이 필요합니다.' : '관리자 권한이 필요합니다.' },
      { status: access.status },
    );
  }

  const { id } = await params;

  const { error } = await supabaseServer.from('post_drafts').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
