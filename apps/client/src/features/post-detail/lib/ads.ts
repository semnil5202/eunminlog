import {
  ADVERTISEMENT_ARTICLE_SLOT_KEYS,
  ADVERTISEMENT_MEDIATION_CONFIG,
  type AdvertisementSlotKey,
} from '@/shared/constants/ad';
import { getEligibleSecondLevelHeadingIndexes } from './article-ad-placement';

const createAdvertisementPlaceholder = (
  advertisementLabel: string,
  sequence: number,
  slotKey: AdvertisementSlotKey,
): string => {
  const escapedLabel = advertisementLabel
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  const slotConfig = ADVERTISEMENT_MEDIATION_CONFIG.slots[slotKey];
  if (!slotConfig.enabled) return '';

  return `\n\n<div class="not-prose relative my-[40px] w-full min-h-[250px]" data-advertisement-label="${escapedLabel}" data-ad-slot="article_${sequence}" data-ad-slot-key="${slotKey}" data-ad-format="in_article" data-ad-position="article_section_${sequence}" data-ad-placement="${slotConfig.placement}" data-ad-load-strategy="lazy" data-ad-fallback-index="${sequence - 1}" data-ad-active-provider="none"></div>\n\n`;
};

/**
 * 직전 섹션에 충분한 본문이 있는 H2 직전에 광고 예약 영역을 최대 10개 삽입한다.
 * @param html 본문 HTML 문자열
 * @param advertisementLabel 광고 접근성 라벨
 */
export const insertInArticleAds = (html: string, advertisementLabel: string): string => {
  const sections = html.split(/(?=<h2(?:\s|>))/i);
  const insertionIndexes = new Set(
    getEligibleSecondLevelHeadingIndexes(html, ADVERTISEMENT_ARTICLE_SLOT_KEYS.length),
  );
  if (insertionIndexes.size === 0) return html;

  let articleSlotIndex = 0;
  return sections
    .map((section, sectionIndex) => {
      if (!insertionIndexes.has(sectionIndex)) return section;

      const slotKey = ADVERTISEMENT_ARTICLE_SLOT_KEYS[articleSlotIndex];
      const logicalSequence = articleSlotIndex + 1;
      articleSlotIndex += 1;
      if (!ADVERTISEMENT_MEDIATION_CONFIG.slots[slotKey].enabled) return section;
      return createAdvertisementPlaceholder(advertisementLabel, logicalSequence, slotKey) + section;
    })
    .join('');
};
