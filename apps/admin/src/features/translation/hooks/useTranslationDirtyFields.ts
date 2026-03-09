import { useMemo } from 'react';

import type { ImageAlt } from '../types';

function stripImages(html: string): string {
  if (typeof window === 'undefined') return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  doc.querySelectorAll('img').forEach((img) => img.remove());
  return doc.body.innerHTML;
}

type ReferenceValues = {
  title: string;
  content: string;
  description: string;
  placeName: string;
  address: string;
  productNames: string[];
  purchaseSources: string[];
  pricePrefix: string;
  imageAlts: ImageAlt[];
  thumbnailAlt: string;
};

type CurrentValues = {
  title: string;
  content: string;
  description: string;
  placeName: string;
  address: string;
  productNames: string[];
  purchaseSources: string[];
  pricePrefix: string;
  imageAlts: ImageAlt[];
  thumbnailAlt: string;
};

/**
 * 기준값(스냅샷 또는 서버 원본)과 현재 폼 값을 비교해 수정된 필드 Set을 반환한다.
 * @param referenceValues 번역 시점의 기준값 (null이면 빈 Set 반환)
 */
export function useTranslationDirtyFields(
  referenceValues: ReferenceValues | null,
  currentValues: CurrentValues,
): Set<string> {
  return useMemo(() => {
    if (!referenceValues) return new Set<string>();

    const dirty = new Set<string>();
    if (currentValues.title !== referenceValues.title) dirty.add('title');
    if (currentValues.content !== referenceValues.content) {
      const textChanged = stripImages(currentValues.content) !== stripImages(referenceValues.content);
      dirty.add(textChanged ? 'content' : 'content_image_only');
    }
    if (currentValues.description !== referenceValues.description) dirty.add('description');
    if (currentValues.placeName !== referenceValues.placeName) dirty.add('place_name');
    if (currentValues.address !== referenceValues.address) dirty.add('address');
    if (JSON.stringify(currentValues.productNames) !== JSON.stringify(referenceValues.productNames))
      dirty.add('product_name');
    if (JSON.stringify(currentValues.purchaseSources) !== JSON.stringify(referenceValues.purchaseSources))
      dirty.add('purchase_source');
    if (currentValues.pricePrefix !== referenceValues.pricePrefix) dirty.add('price_prefix');
    const currentAltsText = currentValues.imageAlts.map((a) => a.alt).join('\n');
    const referenceAltsText = referenceValues.imageAlts.map((a) => a.alt).join('\n');
    if (
      currentValues.thumbnailAlt !== referenceValues.thumbnailAlt ||
      currentAltsText !== referenceAltsText
    ) {
      dirty.add('image_alts');
    }
    return dirty;
  }, [referenceValues, currentValues]);
}
