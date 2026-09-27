/** Markdown 구분자 형식의 번역 결과를 파싱한다. */

import type { TranslationLocale } from '@/shared/types/post';
import type { TranslationResult } from '@/features/translation/types';
import { getTranslationFields, type PromptBuildParams } from './prompt-builder';

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

function normalizeResult(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replaceAll('\\---', '---')
    .replace(/^(---[^\n]+---)[ \t]+$/gm, '$1')
    .trim();
}

/** 원문 기준으로 번역 파일의 구조와 필수 항목을 확인한다. */
export function validateTranslationResult(
  rawInput: string,
  source: PromptBuildParams,
): { results: ParsedLocaleResult[]; errors: string[] } {
  const raw = normalizeResult(rawInput);
  const errors: string[] = [];
  const blocks = [...raw.matchAll(/^---LOCALE:([^\n]+)---[ \t]*$/gm)];
  const expectedFields = getTranslationFields(source);
  const sourceTags = source.content.match(/<!--[\s\S]*?-->|<[^>]+>/g) ?? [];

  for (const locale of LOCALES) {
    const count = blocks.filter((block) => block[1] === locale).length;
    if (count !== 1)
      errors.push(`${locale}: 언어 구간이 ${count === 0 ? '누락' : '중복'}되었습니다.`);
  }
  if (blocks[0]?.index !== 0) errors.push('파일은 LOCALE 구분자로 시작해야 합니다.');

  for (const [index, match] of blocks.entries()) {
    const locale = match[1];
    if (!LOCALES.includes(locale as TranslationLocale)) {
      errors.push(`지원하지 않는 언어 구간입니다: ${locale}`);
      continue;
    }
    const block = raw.slice(match.index! + match[0].length, blocks[index + 1]?.index);
    const markers = [...block.matchAll(/^---([A-Z_]+)---[ \t]*$/gm)];
    for (const [field, count] of Object.entries(expectedFields)) {
      const occurrences = markers.filter((marker) => marker[1] === field);
      if (occurrences.length !== 1) {
        errors.push(`${locale}: ${field} 필드가 누락되거나 중복되었습니다.`);
        continue;
      }
      const marker = occurrences[0]!;
      const markerIndex = markers.indexOf(marker);
      const value = block
        .slice(marker.index! + marker[0].length, markers[markerIndex + 1]?.index)
        .trim();
      if (!value) errors.push(`${locale}: ${field} 값이 비어 있습니다.`);
      if (count > 0) {
        const lines = value.split('\n').filter((line) => line.trim());
        if (
          lines.length !== count ||
          lines.some((line, i) => !new RegExp(`^${i + 1}\\.\\s+\\S`).test(line.trim()))
        ) {
          errors.push(
            `${locale}: ${field} 목록은 원문과 같은 ${count}개 항목을 1번부터 순서대로 포함해야 합니다.`,
          );
        }
      }
      if (field === 'CONTENT') {
        const tags = value.match(/<!--[\s\S]*?-->|<[^>]+>/g) ?? [];
        if (JSON.stringify(tags) !== JSON.stringify(sourceTags)) {
          errors.push(
            `${locale}: 본문 HTML 구조가 원문과 다릅니다. 잘림 또는 태그·속성 변경을 확인해주세요.`,
          );
        }
      }
    }
    if (markers.some((marker) => !(marker[1]! in expectedFields))) {
      errors.push(`${locale}: 원문에 없는 필드가 포함되어 있습니다.`);
    }
    if (markers.at(-1)?.[1] !== 'CONTENT')
      errors.push(`${locale}: 마지막 필드는 CONTENT여야 합니다.`);
  }
  return { results: errors.length ? [] : parseTranslationResult(raw), errors };
}

function extractSection(block: string, marker: string): string {
  const regex = new RegExp(
    `(?:^|\\n)---${marker}---\\n([\\s\\S]*?)(?=\\n---[A-Z_]+---(?:\\n|$)|$)`,
  );
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

export function parseTranslationResult(rawInput: string): ParsedLocaleResult[] {
  const raw = normalizeResult(rawInput);
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

export function fromTranslationResults(results: TranslationResult[]): ParsedLocaleResult[] {
  return results.map((result) => ({
    locale: result.locale,
    title: result.title,
    description: result.description,
    placeName: result.place_name,
    address: result.address,
    pricePrefix: result.price_prefix?.[0] ?? '',
    productNames: result.product_name,
    purchaseSources: result.purchase_source,
    pricePrefixes: result.price_prefix,
    thumbnailAlt: result.thumbnail_alt,
    imageAlts: result.image_alts.map((item) => item.alt),
    content: result.content,
  }));
}

export function toTranslationResults(parsed: ParsedLocaleResult[]): TranslationResult[] {
  return parsed.map((r) => ({
    locale: r.locale,
    title: r.title,
    content: r.content,
    description: r.description,
    place_name: r.placeName,
    address: r.address,
    product_name: r.productNames,
    purchase_source: r.purchaseSources,
    price_prefix:
      r.pricePrefixes.length > 0 ? r.pricePrefixes : r.pricePrefix ? [r.pricePrefix] : [],
    image_alts: r.imageAlts.map((alt) => ({ src: '', alt })),
    thumbnail_alt: r.thumbnailAlt,
  }));
}
