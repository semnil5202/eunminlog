import { openai } from '@/shared/lib/openai';
import {
  EXTRACT_TERMS_SYSTEM_PROMPT,
  buildTranslateSystemPrompt,
} from '@/shared/constants/prompts';
import type { FlaggedTerm, ImageAlt, SelectiveTranslateOptions, TranslationResult } from '../types';
import type { TranslationLocale } from '@/shared/types/post';
import { splitHtmlIntoSections, reassembleSections } from '../lib/html-sections';

const TARGET_LOCALES: TranslationLocale[] = ['en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th'];

export { TARGET_LOCALES };

export async function fetchExtractTerms(
  content: string,
  placeName?: string,
  address?: string,
  imageAlts?: string[],
): Promise<FlaggedTerm[]> {
  let userPrompt = `본문:\n${content}`;
  if (placeName) userPrompt += `\n\n장소명: ${placeName}`;
  if (address) userPrompt += `\n주소: ${address}`;
  if (imageAlts && imageAlts.length > 0) {
    userPrompt += '\n\n이미지 alt 텍스트:';
    imageAlts.forEach((alt, i) => {
      userPrompt += `\n- 이미지 ${i + 1}: "${alt}"`;
    });
  }

  const stream = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    response_format: { type: 'json_object' },
    stream: true,
    messages: [
      { role: 'system', content: EXTRACT_TERMS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  let fullText = '';
  for await (const chunk of stream) {
    fullText += chunk.choices[0]?.delta?.content ?? '';
  }

  const parsed = JSON.parse(fullText || '{"terms":[]}') as Record<string, unknown>;
  const arr = Array.isArray(parsed) ? parsed : ((parsed.terms ?? []) as Record<string, unknown>[]);
  return arr.map((item: Record<string, unknown>) => ({
    original: (item.original ?? item.term ?? '') as string,
    suggestions: (item.suggestions ?? item.translations ?? []) as string[],
  }));
}

function parseJsonResponse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('JSON 파싱에 실패했습니다.');
  }
}

function replaceImgTags(html: string): { cleaned: string; imgs: string[] } {
  const imgs: string[] = [];
  const cleaned = html.replace(/<img[^>]*>/gi, (match) => {
    const index = imgs.length;
    imgs.push(match);
    return `{{IMG_${index}}}`;
  });
  return { cleaned, imgs };
}

function restoreImgTags(html: string, imgs: string[]): string {
  return html.replace(/\{\{IMG_(\d+)\}\}/g, (_, index) => imgs[Number(index)] ?? '');
}

function addSectionMarkers(html: string): string {
  if (typeof window === 'undefined') return html;
  const sections = splitHtmlIntoSections(html);
  return sections.map((s) => `[SECTION ${s.index}] ${s.html}`).join('\n');
}

export type TranslateParams = {
  title: string;
  content: string;
  description: string;
  placeName?: string;
  address?: string;
  productNames?: string[];
  purchaseSources?: string[];
  pricePrefix?: string;
  confirmedTerms: { original: string; confirmed: string }[];
  imageAlts?: ImageAlt[];
  thumbnailAlt?: string;
};

async function fetchTranslateSingle(
  locale: TranslationLocale,
  params: TranslateParams,
  signal?: AbortSignal,
  selectiveOptions?: SelectiveTranslateOptions,
): Promise<TranslationResult> {
  const {
    title,
    content,
    description,
    placeName,
    address,
    productNames,
    purchaseSources,
    pricePrefix,
    confirmedTerms,
    imageAlts,
    thumbnailAlt,
  } = params;

  const isSelective = selectiveOptions &&
    ((selectiveOptions.targetFields && selectiveOptions.targetFields.length > 0) ||
     (selectiveOptions.targetSectionIndices && selectiveOptions.targetSectionIndices.length > 0));

  const { cleaned: contentWithPlaceholders, imgs } = replaceImgTags(content);

  const contentBody = isSelective
    ? addSectionMarkers(contentWithPlaceholders)
    : contentWithPlaceholders;

  let userPrompt = `제목: ${title}\n\n본문:\n${contentBody}\n\n3줄 요약:\n${description}`;
  if (placeName) userPrompt += `\n\n장소명: ${placeName}`;
  if (address) userPrompt += `\n주소: ${address}`;
  if (productNames && productNames.length > 0) {
    userPrompt += `\n\n제품명:\n${productNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}`;
  }
  if (purchaseSources && purchaseSources.length > 0) {
    userPrompt += `\n구매처:\n${purchaseSources.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  }
  if (pricePrefix) userPrompt += `\n가격설명: ${pricePrefix}`;

  if (confirmedTerms.length > 0) {
    userPrompt += '\n\n확정 번역 용어:';
    for (const term of confirmedTerms) {
      userPrompt += `\n- "${term.original}" → "${term.confirmed}"`;
    }
  }

  if (imageAlts && imageAlts.length > 0) {
    userPrompt += '\n\n이미지 alt 텍스트:';
    imageAlts.forEach((item, i) => {
      userPrompt += `\n- 이미지 ${i + 1}: "${item.alt}"`;
    });
  }

  if (thumbnailAlt) {
    userPrompt += `\n\n썸네일 alt 텍스트: "${thumbnailAlt}"`;
  }

  const systemPrompt = isSelective
    ? buildTranslateSystemPrompt(locale, {
        targetFields: selectiveOptions.targetFields?.map(String),
        targetSectionIndices: selectiveOptions.targetSectionIndices,
      })
    : buildTranslateSystemPrompt(locale);

  const stream = await openai.chat.completions.create(
    {
      model: 'gpt-5-mini',
      response_format: { type: 'json_object' },
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    { signal },
  );

  let fullText = '';
  for await (const chunk of stream) {
    fullText += chunk.choices[0]?.delta?.content ?? '';
  }

  const parsed = parseJsonResponse(fullText) as Record<string, unknown>;

  const translatedAlts = Array.isArray(parsed.image_alts) ? (parsed.image_alts as string[]) : [];
  const resultImageAlts = (imageAlts ?? []).map((orig, i) => ({
    src: orig.src,
    alt: translatedAlts[i] ?? orig.alt,
  }));

  // Handle selective content_sections response
  let resultContent: string;
  if (isSelective && parsed.content_sections && typeof parsed.content_sections === 'object') {
    const contentSections = parsed.content_sections as Record<string, string>;
    const existingSections = splitHtmlIntoSections(content);
    const mergedSections = existingSections.map((s) => {
      const translated = contentSections[String(s.index)];
      if (translated) {
        return { ...s, html: restoreImgTags(translated, imgs) };
      }
      return s;
    });
    resultContent = reassembleSections(mergedSections);
  } else {
    resultContent = restoreImgTags((parsed.content as string) ?? '', imgs);
  }

  const parseStringArray = (val: unknown): string[] => {
    if (Array.isArray(val)) return val as string[];
    if (typeof val === 'string' && val) return [val];
    return [];
  };

  return {
    locale,
    title: (parsed.title as string) ?? '',
    content: resultContent,
    description: (parsed.description as string) ?? '',
    place_name: (parsed.place_name as string) ?? '',
    address: (parsed.address as string) ?? '',
    product_name: parseStringArray(parsed.product_name),
    purchase_source: parseStringArray(parsed.purchase_source),
    price_prefix: (parsed.price_prefix as string) ?? '',
    image_alts: resultImageAlts,
    thumbnail_alt: (parsed.thumbnail_alt as string) ?? '',
  };
}

export async function fetchTranslatePost(
  params: TranslateParams,
  signal?: AbortSignal,
): Promise<TranslationResult[]> {
  const settled = await Promise.allSettled(
    TARGET_LOCALES.map((locale) => fetchTranslateSingle(locale, params, signal)),
  );

  return settled.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    return {
      locale: TARGET_LOCALES[i],
      title: '',
      content: '',
      description: '',
      place_name: '',
      address: '',
      product_name: [],
      purchase_source: [],
      price_prefix: '',
      image_alts: [] as TranslationResult['image_alts'],
      thumbnail_alt: '',
      failed: true,
    } satisfies TranslationResult;
  });
}

export async function fetchRetrySingleLocale(
  locale: TranslationLocale,
  params: TranslateParams,
  signal?: AbortSignal,
  selectiveOptions?: SelectiveTranslateOptions,
): Promise<TranslationResult> {
  return fetchTranslateSingle(locale, params, signal, selectiveOptions);
}
