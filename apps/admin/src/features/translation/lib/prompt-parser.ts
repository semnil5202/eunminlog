/** Markdown 구분자 형식의 번역 결과를 파싱한다. */

import type { TranslationLocale } from '@/shared/types/post';

export type ParsedLocaleResult = {
  locale: TranslationLocale;
  title: string;
  description: string;
  placeName: string;
  address: string;
  pricePrefix: string;
  productNames: string[];
  purchaseSources: string[];
  pricePrefixes: string[];
  thumbnailAlt: string;
  imageAlts: string[];
  content: string;
};

const LOCALES: TranslationLocale[] = ['en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th'];

function extractSection(block: string, marker: string): string {
  const regex = new RegExp(`---${marker}---\\n([\\s\\S]*?)(?=\\n---[A-Z]|$)`);
  const match = block.match(regex);
  return match?.[1]?.trim() ?? '';
}

function parseNumberedList(text: string): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
}

export function parseTranslationResult(raw: string): ParsedLocaleResult[] {
  const results: ParsedLocaleResult[] = [];

  for (const locale of LOCALES) {
    const localeMarker = `---LOCALE:${locale}---`;
    const startIdx = raw.indexOf(localeMarker);
    if (startIdx === -1) continue;

    const nextLocaleIdx = LOCALES.filter((l) => l !== locale)
      .map((l) => raw.indexOf(`---LOCALE:${l}---`, startIdx + localeMarker.length))
      .filter((i) => i !== -1);

    const endIdx = nextLocaleIdx.length > 0 ? Math.min(...nextLocaleIdx) : raw.length;
    const block = raw.slice(startIdx + localeMarker.length, endIdx);

    results.push({
      locale,
      title: extractSection(block, 'TITLE'),
      description: extractSection(block, 'DESCRIPTION'),
      placeName: extractSection(block, 'PLACE_NAME'),
      address: extractSection(block, 'ADDRESS'),
      pricePrefix: extractSection(block, 'PRICE_PREFIX'),
      productNames: parseNumberedList(extractSection(block, 'PRODUCT_NAMES')),
      purchaseSources: parseNumberedList(extractSection(block, 'PURCHASE_SOURCES')),
      pricePrefixes: parseNumberedList(extractSection(block, 'PRICE_PREFIXES')),
      thumbnailAlt: extractSection(block, 'THUMBNAIL_ALT'),
      imageAlts: parseNumberedList(extractSection(block, 'IMAGE_ALTS')),
      content: extractSection(block, 'CONTENT'),
    });
  }

  return results;
}
