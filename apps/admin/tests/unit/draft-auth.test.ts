import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAdminAccess, from } = vi.hoisted(() => ({
  getAdminAccess: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/shared/lib/admin-auth', () => ({ getAdminAccess }));
vi.mock('@/shared/lib/supabase-server', () => ({ supabaseServer: { from } }));

import { GET as listDrafts, POST as saveDraft } from '@/app/api/drafts/route';
import { DELETE as deleteDraft, GET as getDraft } from '@/app/api/drafts/[id]/route';

beforeEach(() => {
  getAdminAccess.mockReset();
  from.mockReset();
});

describe('임시저장 API 권한 경계', () => {
  for (const status of [401, 403] as const) {
    it(`${status} 상태에서는 조회·생성·삭제 및 최대 개수 정리 전에 거부한다`, async () => {
      getAdminAccess.mockResolvedValue({ status });
      const params = { params: Promise.resolve({ id: 'draft-1' }) };
      const responses = await Promise.all([
        listDrafts(),
        saveDraft(new Request('https://admin.example/api/drafts', { method: 'POST', body: '{}' })),
        getDraft(new Request('https://admin.example/api/drafts/draft-1'), params),
        deleteDraft(
          new Request('https://admin.example/api/drafts/draft-1', { method: 'DELETE' }),
          params,
        ),
      ]);
      expect(responses.map((response) => response.status)).toEqual([
        status,
        status,
        status,
        status,
      ]);
      expect(from).not.toHaveBeenCalled();
    });
  }

  it('관리자는 기존 임시저장 목록을 조회한다', async () => {
    getAdminAccess.mockResolvedValue({ status: 200, user: { id: 'admin-1' } });
    const limit = vi.fn().mockResolvedValue({ data: [{ id: 'draft-1', title: '작성 중' }], error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ order });
    from.mockReturnValue({ select });

    const response = await listDrafts();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ drafts: [{ id: 'draft-1', title: '작성 중' }] });
    expect(from).toHaveBeenCalledWith('post_drafts');
  });
});
