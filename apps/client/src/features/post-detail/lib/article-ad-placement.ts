const MINIMUM_CHARACTERS_BEFORE_ADVERTISEMENT = 250;

const WHITESPACE_ENTITY_NAMES = new Set(['nbsp', 'ensp', 'emsp', 'thinsp', 'tab', 'newline']);
const ZERO_WIDTH_ENTITY_NAMES = new Set(['zerowidthspace', 'zwnj', 'zwj']);

const normalizeHtmlEntity = (entity: string): string => {
  const entityBody = entity.slice(1, -1).toLowerCase();
  if (WHITESPACE_ENTITY_NAMES.has(entityBody)) return ' ';
  if (ZERO_WIDTH_ENTITY_NAMES.has(entityBody)) return '';

  if (entityBody.startsWith('#')) {
    const isHexadecimal = entityBody.startsWith('#x');
    const codePointText = entityBody.slice(isHexadecimal ? 2 : 1);
    const codePoint = Number.parseInt(codePointText, isHexadecimal ? 16 : 10);
    if (Number.isFinite(codePoint)) {
      try {
        return /\s/u.test(String.fromCodePoint(codePoint)) ? ' ' : 'x';
      } catch {
        return '';
      }
    }
  }

  return 'x';
};

const getTextLength = (html: string): number =>
  html
    .replace(/<(script|style)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/gi, normalizeHtmlEntity)
    .replace(/\s+/g, ' ')
    .trim().length;

const removeLeadingSecondLevelHeading = (html: string): string =>
  html.replace(/^<h2(?:\s[^>]*)?>[\s\S]*?<\/h2>/i, '');

const hasImage = (html: string): boolean => /<img(?:\s[^>]*)?\s*\/?>/i.test(html);

/** 적격 H2 앞 광고 삽입 위치를 문서 순서대로 반환한다. */
export const getEligibleSecondLevelHeadingIndexes = (
  html: string,
  maximumAdvertisements: number,
): number[] => {
  const sections = html.split(/(?=<h2(?:\s|>))/i);
  if (sections.length <= 1 || maximumAdvertisements <= 0) return [];

  const insertionIndexes: number[] = [];
  for (let sectionIndex = 1; sectionIndex < sections.length; sectionIndex += 1) {
    if (insertionIndexes.length >= maximumAdvertisements) break;

    const precedingSection =
      sectionIndex === 1
        ? (sections[0] ?? '')
        : removeLeadingSecondLevelHeading(sections[sectionIndex - 1] ?? '');
    if (
      getTextLength(precedingSection) >= MINIMUM_CHARACTERS_BEFORE_ADVERTISEMENT ||
      hasImage(precedingSection)
    ) {
      insertionIndexes.push(sectionIndex);
    }
  }

  return insertionIndexes;
};
