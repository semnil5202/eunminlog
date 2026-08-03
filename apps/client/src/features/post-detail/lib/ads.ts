const createAdvertisementPlaceholder = (advertisementLabel: string, sequence: number): string => {
  const escapedLabel = advertisementLabel
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  return `\n\n<div class="not-prose relative my-8 w-full min-h-[250px]" data-advertisement-label="${escapedLabel}" data-ad-slot="article_${sequence}" data-ad-format="in_article" data-ad-position="article_section_${sequence}" data-ad-placement="article" data-ad-load-strategy="lazy" data-ad-fallback-index="${sequence - 1}" data-ad-active-provider="none"></div>\n\n`;
};

const getTextLength = (html: string): number =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;

const MINIMUM_PARAGRAPHS_BEFORE_FIRST_ADVERTISEMENT = 2;
const MINIMUM_CHARACTERS_BEFORE_FIRST_ADVERTISEMENT = 300;
const MINIMUM_CHARACTERS_BETWEEN_ADVERTISEMENTS = 600;
const MINIMUM_CHARACTERS_AFTER_SECOND_ADVERTISEMENT = 300;

/**
 * 충분한 본문이 있을 때 첫 H2와 마지막 H2 직전에 광고 예약 영역을 삽입한다.
 * @param html 본문 HTML 문자열
 * @param advertisementLabel 광고 접근성 라벨
 */
export const insertInArticleAds = (html: string, advertisementLabel: string): string => {
  const sections = html.split(/(?=<h2(?:\s|>))/i);
  if (sections.length <= 2) return html;

  const insertionIndexes = new Set<number>();
  const introductoryContent = sections[0] ?? '';
  const introductoryParagraphCount = introductoryContent.match(/<p(?:\s|>)/gi)?.length ?? 0;
  if (
    introductoryParagraphCount >= MINIMUM_PARAGRAPHS_BEFORE_FIRST_ADVERTISEMENT ||
    getTextLength(introductoryContent) >= MINIMUM_CHARACTERS_BEFORE_FIRST_ADVERTISEMENT
  ) {
    insertionIndexes.add(1);
  }
  const lastSectionIndex = sections.length - 1;
  const contentBetweenAdvertisements = getTextLength(sections.slice(1, lastSectionIndex).join(''));
  const contentAfterSecondAdvertisement = getTextLength(sections[lastSectionIndex] ?? '');
  if (
    contentBetweenAdvertisements >= MINIMUM_CHARACTERS_BETWEEN_ADVERTISEMENTS &&
    contentAfterSecondAdvertisement >= MINIMUM_CHARACTERS_AFTER_SECOND_ADVERTISEMENT
  ) {
    insertionIndexes.add(lastSectionIndex);
  }
  let sequence = 0;
  return sections
    .map((section, sectionIndex) => {
      if (!insertionIndexes.has(sectionIndex)) return section;
      sequence += 1;
      return createAdvertisementPlaceholder(advertisementLabel, sequence) + section;
    })
    .join('');
};
