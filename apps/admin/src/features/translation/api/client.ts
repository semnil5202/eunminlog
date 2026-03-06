import type { FlaggedTerm, ImageAlt, TranslationResult } from '../types';
import type { TranslationLocale } from '@/shared/types/post';

const TARGET_LOCALES: TranslationLocale[] = ['en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th'];

const LOCALE_LABELS: Record<TranslationLocale, string> = {
  en: '영어',
  ja: '일본어',
  'zh-CN': '중국어 간체',
  'zh-TW': '중국어 번체',
  id: '인도네시아어',
  vi: '베트남어',
  th: '태국어',
};

export { LOCALE_LABELS, TARGET_LOCALES };

export async function fetchExtractTerms(
  content: string,
  placeName?: string,
  address?: string,
  imageAlts?: string[],
): Promise<FlaggedTerm[]> {
  const res = await fetch('/api/extract-terms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, placeName, address, imageAlts }),
  });

  if (!res.ok) throw new Error('용어 추출에 실패했습니다.');

  const data = (await res.json()) as { terms: FlaggedTerm[] };
  return data.terms;
}

type TranslateParams = {
  title: string;
  content: string;
  description: string;
  placeName?: string;
  address?: string;
  confirmedTerms: { original: string; confirmed: string }[];
  imageAlts?: ImageAlt[];
  thumbnailAlt?: string;
};

async function fetchTranslateSingle(
  locale: TranslationLocale,
  params: TranslateParams,
): Promise<TranslationResult> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale, ...params }),
  });

  if (!res.ok) throw new Error(`${LOCALE_LABELS[locale]} 번역에 실패했습니다.`);

  return (await res.json()) as TranslationResult;
}

export async function fetchTranslatePost(params: TranslateParams): Promise<TranslationResult[]> {
  const settled = await Promise.allSettled(
    TARGET_LOCALES.map((locale) => fetchTranslateSingle(locale, params)),
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
      image_alts: [] as TranslationResult['image_alts'],
      thumbnail_alt: '',
      failed: true,
    } satisfies TranslationResult;
  });
}

export async function fetchRetrySingleLocale(
  locale: TranslationLocale,
  params: TranslateParams,
): Promise<TranslationResult> {
  return fetchTranslateSingle(locale, params);
}
