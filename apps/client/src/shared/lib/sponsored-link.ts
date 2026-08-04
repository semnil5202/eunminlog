/** 협찬·쿠팡 파트너스 글의 외부 링크에 rel="sponsored"를 주입한다. */

const INTERNAL_HOST = 'eunminlog.site';

function isExternalHref(href: string): boolean {
  try {
    return !new URL(href).hostname.endsWith(INTERNAL_HOST);
  } catch {
    return false;
  }
}

export function injectSponsoredRel(html: string): string {
  return html.replace(
    /<a\s([^>]*?)href="([^"]*?)"([^>]*?)>/gi,
    (match, before: string, href: string, after: string) => {
      if (!isExternalHref(href)) return match;

      const full = before + after;
      if (full.includes('rel="')) {
        return match.replace(/rel="([^"]*)"/, (relMatch, relValue: string) => {
          if (relValue.includes('sponsored')) return relMatch;
          return `rel="sponsored ${relValue}"`;
        });
      }

      return `<a ${before}href="${href}" rel="sponsored noopener noreferrer"${after}>`;
    },
  );
}
