import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { lookup, httpsRequest } = vi.hoisted(() => ({ lookup: vi.fn(), httpsRequest: vi.fn() }));
vi.mock('node:dns/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:dns/promises')>();
  return { ...original, default: { ...original, lookup }, lookup };
});
vi.mock('node:https', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:https')>();
  return { ...original, default: { ...original, request: httpsRequest }, request: httpsRequest };
});

import { fetchOgHtml, OgFetchError } from '@/shared/lib/og-fetch';

function respond(status: number, headers: Record<string, string>, body = '') {
  httpsRequest.mockImplementation((_url, options, callback) => {
    const request = new EventEmitter() as EventEmitter & { end: () => void; destroy: (error: Error) => void };
    request.end = () => {
      options.lookup('example.com', {}, (_error: Error | null, address: string) => {
        expect(address).toBe('8.8.8.8');
      });
      const response = new PassThrough() as PassThrough & { statusCode: number; headers: Record<string, string> };
      response.statusCode = status;
      response.headers = headers;
      callback(response);
      response.end(body);
    };
    request.destroy = (error) => request.emit('error', error);
    return request;
  });
}

beforeEach(() => {
  lookup.mockReset().mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
  httpsRequest.mockReset();
});

describe('OG 서버 조회 경계', () => {
  it('검증한 공개 DNS 주소를 실제 연결에 고정한다', async () => {
    respond(200, { 'content-type': 'text/html' }, '<title>ok</title>');
    const result = await fetchOgHtml('https://example.com/');
    expect(result.html).toBe('<title>ok</title>');
    expect(lookup).toHaveBeenCalledWith('example.com', { all: true, family: 4 });
    expect(httpsRequest).toHaveBeenCalledOnce();
  });

  it('리다이렉트 목적지가 사설 주소이면 두 번째 요청 전에 거부한다', async () => {
    respond(302, { location: 'http://169.254.169.254/latest/meta-data/' });
    await expect(fetchOgHtml('https://example.com/')).rejects.toMatchObject({ status: 400 });
    expect(httpsRequest).toHaveBeenCalledOnce();
  });

  it('512KiB를 넘는 HTML 응답을 거부한다', async () => {
    respond(200, { 'content-type': 'text/html' }, 'x'.repeat(512 * 1024 + 1));
    await expect(fetchOgHtml('https://example.com/')).rejects.toMatchObject({ status: 413 });
  });

  it('DNS 지연에도 전체 5초 제한을 적용한다', async () => {
    vi.useFakeTimers();
    lookup.mockImplementation(() => new Promise(() => {}));
    try {
      const result = expect(fetchOgHtml('https://example.com/')).rejects.toEqual(
        new OgFetchError(504, 'OG request timed out'),
      );
      await vi.advanceTimersByTimeAsync(5001);
      await result;
      expect(httpsRequest).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
