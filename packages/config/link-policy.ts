/** 상대 주소와 은민로그 도메인·하위 도메인을 내부 링크로 판단한다. */
export function isInternalLink(href: string): boolean {
  if (!href.trim()) return false;
  try {
    const url = new URL(href, 'https://eunminlog.site');
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      (url.hostname === 'eunminlog.site' || url.hostname.endsWith('.eunminlog.site'))
    );
  } catch {
    return false;
  }
}

/** 내부 링크의 nofollow만 제거하고 나머지 관계 속성은 보존한다. */
export function normalizeLinkRel(href: string, rel: string): string {
  if (!isInternalLink(href)) return rel;
  return rel
    .split(/\s+/)
    .filter((token) => token && token.toLowerCase() !== 'nofollow')
    .join(' ');
}

/** 기존 저장 본문도 내부 링크 정책에 맞춰 출력한다. */
export function normalizeInternalLinkRels(html: string): string {
  return html.replace(/<a\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, (tag) => {
    const attributes = [...tag.matchAll(/\s+([\w:-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g)];
    const href = attributes.find((attr) => attr[1].toLowerCase() === 'href');
    const rel = attributes.find((attr) => attr[1].toLowerCase() === 'rel');
    if (!href || !rel) return tag;
    const unquote = (value: string) => (/^["']/.test(value) ? value.slice(1, -1) : value);
    const original = unquote(rel[2]);
    const normalized = normalizeLinkRel(unquote(href[2]), original);
    if (normalized === original) return tag;
    const start = rel.index!;
    return (
      tag.slice(0, start) +
      (normalized ? ` rel="${normalized.replace(/"/g, '&quot;')}"` : '') +
      tag.slice(start + rel[0].length)
    );
  });
}
