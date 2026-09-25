import { describe, expect, it } from 'vitest';
import { extractImageSrcs } from '@/features/post-editor/components/ImageAltSheet';
import {
  splitHtmlIntoSections,
  isTranslatableSection,
} from '@/features/translation/lib/html-sections';
import { injectOptimizedUrls } from '../../../client/src/shared/lib/image';

describe('캐러셀 HTML의 소비자 호환', () => {
  const source = 'https://media.eunminlog.site/posts/2026/09/one.webp';
  const html = `<p>설명</p><div data-type="image-carousel"><img src="${source}" data-width="72%" data-height="ratio:1.5000" width="688" height="459" alt="장소 사진"></div>`;

  it('alt 관리에는 캐러셀 원본 src가 포함된다', () => {
    expect(extractImageSrcs(html)).toEqual([source]);
  });
  it('번역은 캐러셀을 이미지 블록으로 취급하고 본문 텍스트만 번역한다', () => {
    const sections = splitHtmlIntoSections(html);
    expect(sections.map((section) => section.label)).toEqual(['p', 'img']);
    expect(sections.map(isTranslatableSection)).toEqual([true, false]);
  });
  it('Client 최적화는 크롭·치수·alt를 보존하고 원본 라이트박스 URL을 제공한다', () => {
    const document = new DOMParser().parseFromString(injectOptimizedUrls(html), 'text/html');
    const image = document.querySelector('[data-type="image-carousel"] > img')!;
    expect(image.getAttribute('src')).toBe(source.replace('.webp', '_688.webp'));
    expect(image.getAttribute('data-full')).toBe(source);
    expect(image.getAttribute('data-width')).toBe('72%');
    expect(image.getAttribute('data-height')).toBe('ratio:1.5000');
    expect(image.getAttribute('width')).toBe('688');
    expect(image.getAttribute('height')).toBe('459');
    expect(image.getAttribute('alt')).toBe('장소 사진');
  });
});
