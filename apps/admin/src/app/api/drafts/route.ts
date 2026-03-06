import { NextResponse } from 'next/server';

import { supabaseServer } from '@/shared/lib/supabase-server';

export const dynamic = 'force-dynamic';

const MAX_DRAFTS = 10;

/** GET /api/drafts — 임시저장 목록 (updated_at DESC) */
export async function GET() {
  const { data, error } = await supabaseServer
    .from('post_drafts')
    .select('id, post_id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(MAX_DRAFTS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ drafts: data });
}

/** POST /api/drafts — 임시저장 upsert (최대 10개, 초과 시 가장 오래된 것 삭제) */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    id?: string;
    post_id?: string | null;
    title: string;
    form_data: Record<string, unknown>;
  };

  const now = new Date().toISOString();

  if (body.id) {
    const { data, error } = await supabaseServer
      .from('post_drafts')
      .update({
        title: body.title || '제목 없음',
        form_data: body.form_data,
        post_id: body.post_id ?? null,
        updated_at: now,
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ draft: data });
  }

  const { count } = await supabaseServer
    .from('post_drafts')
    .select('id', { count: 'exact', head: true });

  if (count !== null && count >= MAX_DRAFTS) {
    const { data: oldest } = await supabaseServer
      .from('post_drafts')
      .select('id')
      .order('updated_at', { ascending: true })
      .limit(count - MAX_DRAFTS + 1);

    if (oldest && oldest.length > 0) {
      await supabaseServer
        .from('post_drafts')
        .delete()
        .in('id', oldest.map((d) => d.id));
    }
  }

  const { data, error } = await supabaseServer
    .from('post_drafts')
    .insert({
      title: body.title || '제목 없음',
      form_data: body.form_data,
      post_id: body.post_id ?? null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ draft: data });
}
