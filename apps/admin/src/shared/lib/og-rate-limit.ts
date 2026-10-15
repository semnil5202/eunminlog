const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const requests = new Map<string, { count: number; resetAt: number }>();

/** 인스턴스별 관리자 OG 조회 빈도를 제한한다. */
export function checkOgRateLimit(userId: string, now = Date.now()): { allowed: boolean; retryAfter: number } {
  const current = requests.get(userId);
  if (!current || current.resetAt <= now) {
    requests.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}
