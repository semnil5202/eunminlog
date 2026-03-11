/** 이미지 CDN URL을 리사이즈 변형 URL로 변환한다. */

const RESIZED_SUFFIX = '_688';
const RESIZED_MAX_WIDTH = 688;

export function optimizedUrl(original: string): string {
  if (!original.endsWith('.webp')) return original;
  return original.replace(/\.webp$/, `${RESIZED_SUFFIX}.webp`);
}

export function injectOptimizedUrls(html: string): string {
  return html.replace(
    /<img([^>]*?)src="([^"]+?)\.webp"([^>]*?)>/gi,
    (match, before, base, after) => {
      if (!base.includes('media.eunminlog.site')) return match;

      let result = `<img${before}src="${base}${RESIZED_SUFFIX}.webp" data-full="${base}.webp"${after}>`;

      const widthMatch = result.match(/width="(\d+)"/);
      const heightMatch = result.match(/height="(\d+)"/);
      if (widthMatch && heightMatch) {
        const origW = parseInt(widthMatch[1]);
        const origH = parseInt(heightMatch[1]);
        if (origW > RESIZED_MAX_WIDTH) {
          const scale = RESIZED_MAX_WIDTH / origW;
          const newH = Math.round(origH * scale);
          result = result
            .replace(/width="\d+"/, `width="${RESIZED_MAX_WIDTH}"`)
            .replace(/height="\d+"/, `height="${newH}"`);
        }
      }

      result = result.replace(/>$/, ' loading="lazy" decoding="async">');
      return result;
    },
  );
}
