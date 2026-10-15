import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })),
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser } })),
}));

import { getAdminAccess, requireAdmin } from '@/shared/lib/admin-auth';

beforeEach(() => getUser.mockReset());

describe('관리자 인증 경계', () => {
  it('미인증 사용자는 401로 거부한다', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(getAdminAccess()).resolves.toEqual({ status: 401 });
    await expect(requireAdmin()).rejects.toThrow('인증이 필요합니다.');
  });

  it('로그인한 일반 사용자는 403으로 거부한다', async () => {
    getUser.mockResolvedValue({ data: { user: { app_metadata: { role: 'user' } } }, error: null });
    await expect(getAdminAccess()).resolves.toEqual({ status: 403 });
    await expect(requireAdmin()).rejects.toThrow('관리자 권한이 필요합니다.');
  });

  it('app_metadata에 admin 역할이 있는 사용자만 허용한다', async () => {
    const user = { id: 'admin-1', app_metadata: { role: 'admin' } };
    getUser.mockResolvedValue({ data: { user }, error: null });
    await expect(getAdminAccess()).resolves.toEqual({ status: 200, user });
    await expect(requireAdmin()).resolves.toEqual(user);
  });
});
