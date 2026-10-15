import { describe, expect, it } from 'vitest';
import { isPublicIPv4, parseOgUrl, OgFetchError } from '@/shared/lib/og-fetch';
import { checkOgRateLimit } from '@/shared/lib/og-rate-limit';

describe('OG 목적지 제한', () => {
  it.each([
    'http://localhost/',
    'http://app.local/',
    'http://[::1]/',
    'https://user:pass@example.com/',
    'file:///etc/passwd',
  ])('위험한 URL %s를 거부한다', (input) => {
    expect(() => parseOgUrl(input)).toThrow(OgFetchError);
  });

  it.each(['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '192.0.2.1', '224.0.0.1'])('비공개 IPv4 %s를 거부한다', (address) => {
    expect(isPublicIPv4(address)).toBe(false);
  });

  it('공개 IPv4와 일반 HTTPS URL은 허용한다', () => {
    expect(isPublicIPv4('8.8.8.8')).toBe(true);
    expect(parseOgUrl('https://example.com/post').hostname).toBe('example.com');
  });
});

describe('OG 호출 제한', () => {
  it('관리자별 분당 20회 이후 429로 제한하고 다음 구간에 해제한다', () => {
    const user = crypto.randomUUID();
    const now = 1_000_000;
    for (let index = 0; index < 20; index += 1) {
      expect(checkOgRateLimit(user, now).allowed).toBe(true);
    }
    expect(checkOgRateLimit(user, now)).toEqual({ allowed: false, retryAfter: 60 });
    expect(checkOgRateLimit(user, now + 60_000).allowed).toBe(true);
  });
});
