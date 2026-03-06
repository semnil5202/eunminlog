/** 이미지 CDN URL을 리사이즈 변형 URL로 변환한다. */

const RESIZED_SUFFIX = '_688';

export function optimizedUrl(original: string): string {
  if (!original.endsWith('.webp')) return original;
  return original.replace(/\.webp$/, `${RESIZED_SUFFIX}.webp`);
}

export function injectOptimizedUrls(html: string): string {
  return html.replace(/src="([^"]+?)\.webp"/g, (match, base) => {
    if (!base.includes('media.eunminlog.site')) return match;
    return `src="${base}${RESIZED_SUFFIX}.webp" data-full="${base}.webp"`;
  });
}
