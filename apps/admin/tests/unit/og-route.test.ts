import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/admin-auth', () => ({ getAdminAccess: vi.fn() }));
vi.mock('@/shared/lib/og-fetch', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/lib/og-fetch')>();
  return { ...original, fetchOgHtml: vi.fn() };
});
vi.mock('@/shared/lib/og-rate-limit', () => ({ checkOgRateLimit: vi.fn() }));

import { POST } from '@/app/api/og-metadata/route';
import { getAdminAccess } from '@/shared/lib/admin-auth';
import { fetchOgHtml } from '@/shared/lib/og-fetch';
import { checkOgRateLimit } from '@/shared/lib/og-rate-limit';

const request = () => new Request('https://admin.example.com/api/og-metadata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com/post' }),
});

beforeEach(() => {
  vi.mocked(getAdminAccess).mockReset();
  vi.mocked(fetchOgHtml).mockReset();
  vi.mocked(checkOgRateLimit).mockReset().mockReturnValue({ allowed: true, retryAfter: 0 });
});

describe('OG Route 권한 경계', () => {
  it.each([401, 403] as const)('%s 계정은 외부 조회 전에 거부한다', async (status) => {
    vi.mocked(getAdminAccess).mockResolvedValue({ status });
    const response = await POST(request());
    expect(response.status).toBe(status);
    expect(fetchOgHtml).not.toHaveBeenCalled();
  });

  it('관리자는 제한 내에서 OG HTML을 조회한다', async () => {
    vi.mocked(getAdminAccess).mockResolvedValue({ status: 200, user: { id: 'admin-1' } } as Awaited<ReturnType<typeof getAdminAccess>>);
    vi.mocked(fetchOgHtml).mockResolvedValue({ url: new URL('https://example.com/post'), html: '<title>Sample</title>' });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ title: 'Sample', domain: 'example.com' });
    expect(fetchOgHtml).toHaveBeenCalledOnce();
  });

  it('호출 한도를 넘으면 외부 조회 전에 429를 반환한다', async () => {
    vi.mocked(getAdminAccess).mockResolvedValue({ status: 200, user: { id: 'admin-1' } } as Awaited<ReturnType<typeof getAdminAccess>>);
    vi.mocked(checkOgRateLimit).mockReturnValue({ allowed: false, retryAfter: 30 });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('30');
    expect(fetchOgHtml).not.toHaveBeenCalled();
  });
});
