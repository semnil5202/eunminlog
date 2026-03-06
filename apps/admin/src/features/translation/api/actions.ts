'use server';

import { openai } from '@/shared/lib/openai';

import type { FlaggedTerm, TranslationResult } from '../types';
import type { TranslationLocale } from '@/shared/types/post';

const EXTRACT_SYSTEM_PROMPT = `당신은 한국어→다국어 번역 전문가입니다.
주어진 한국어 블로그 본문에서 자동 번역이 어려운 용어를 추출해주세요.

추출 대상:
- 한국어 신조어/인터넷 용어 (예: 존맛탱, 내돈내산, 가성비, 혜자)
- 고유 브랜드명/메뉴명 (예: 두쫀쿠, 흑당버블티)
- 문화적 맥락이 필요한 표현 (예: 맛집, 카공, 핫플)
- 축약어/줄임말

추출 제외:
- 일반적인 한국어 단어 (음식, 맛있다, 분위기 등)
- 장소명과 주소 (별도 제공됨)
- 일반 외래어 (파스타, 카페 등)

본문은 HTML 형식입니다. HTML 태그는 무시하고 텍스트만 참고해주세요.

각 용어에 대해 영어 번역 후보를 1~3개 제안해주세요.
번역 후보가 마땅치 않으면 빈 배열로 남겨주세요.

응답은 반드시 JSON 객체로 작성해주세요. 형식: {"terms": [...]}`;

const LOCALE_LABELS: Record<TranslationLocale, string> = {
  en: '영어',
  ja: '일본어',
  'zh-CN': '중국어 간체',
  'zh-TW': '중국어 번체',
  id: '인도네시아어',
  vi: '베트남어',
  th: '태국어',
};

const TARGET_LOCALES = Object.keys(LOCALE_LABELS) as TranslationLocale[];

function buildTranslateSystemPrompt(locale: TranslationLocale): string {
  const label = LOCALE_LABELS[locale];

  let placeRule = '';
  if (locale === 'ja')
    placeRule = '카타카나 또는 한자 표기. 주소는 일본식 순서(도도부현→시구정촌→번지)로 표기';
  else if (locale === 'zh-CN' || locale === 'zh-TW')
    placeRule = '한자 표기. 주소는 중국식 순서(성/시→구→도로→번호)로 표기';
  else if (locale === 'th') placeRule = '태국 문자 음차 또는 원어 유지. 주소는 태국식 순서로 표기';
  else if (locale === 'en')
    placeRule = '로마자 표기. 주소는 영어권 순서(번지→도로→구→시→국가)로 역순 표기';
  else placeRule = '로마자 표기. 주소는 해당 언어권의 자연스러운 순서로 표기';

  return `당신은 한국어 블로그 포스트를 ${label}(${locale})로 번역하는 전문 번역가입니다.

번역 규칙:
1. 본문(content)은 HTML 형식입니다. HTML 태그 구조(<p>, <strong>, <em>, <ul>, <li>, <h2> 등)를 그대로 유지하고 텍스트만 번역해주세요.
2. 3줄 요약(description)은 plain text입니다. 줄바꿈(\\n)을 유지하고 텍스트만 번역해주세요.
3. 확정 번역 용어가 제공되면 반드시 해당 번역을 사용해주세요.
4. 장소명(place_name)과 주소(address)가 제공되면 ${placeRule}해주세요.
5. 블로그의 친근한 어조를 유지하되, ${label}의 자연스러운 표현을 사용해주세요.
6. 한국 고유 문화 용어는 의역하되 괄호 안에 원어를 병기할 수 있습니다.

응답은 반드시 JSON 객체로 작성해주세요. 형식: {"title": "...", "content": "...", "description": "...", "place_name": "...", "address": "..."}
place_name과 address는 입력에 포함된 경우에만 응답에 포함해주세요.`;
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

export async function extractFlaggedTerms(
  content: string,
  placeName?: string,
  address?: string,
): Promise<FlaggedTerm[]> {
  let userPrompt = `본문:\n${content}`;
  if (placeName) userPrompt += `\n\n장소명: ${placeName}`;
  if (address) userPrompt += `\n주소: ${address}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = response.choices[0].message.content ?? '{"terms":[]}';
  console.error('[extractFlaggedTerms] raw:', raw);
  const parsed = parseJsonResponse(raw) as Record<string, unknown>;

  const arr = Array.isArray(parsed) ? parsed : (parsed.terms ?? []);
  return (arr as Record<string, unknown>[]).map((item) => ({
    original: (item.original ?? item.term ?? '') as string,
    suggestions: (item.suggestions ?? item.translations ?? []) as string[],
  }));
}

async function translateSingleLocale(
  locale: TranslationLocale,
  userPrompt: string,
): Promise<TranslationResult> {
  const response = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildTranslateSystemPrompt(locale) },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = response.choices[0].message.content ?? '{}';
  console.error(`[translatePost:${locale}] raw:`, raw);
  const parsed = parseJsonResponse(raw) as Record<string, string>;

  return {
    locale,
    title: parsed.title ?? '',
    content: parsed.content ?? '',
    description: parsed.description ?? '',
    place_name: parsed.place_name ?? '',
    address: parsed.address ?? '',
  };
}

function buildTranslateUserPrompt(params: {
  title: string;
  content: string;
  description: string;
  placeName?: string;
  address?: string;
  confirmedTerms: { original: string; confirmed: string }[];
}): string {
  let userPrompt = `제목: ${params.title}\n\n본문:\n${params.content}\n\n3줄 요약:\n${params.description}`;
  if (params.placeName) userPrompt += `\n\n장소명: ${params.placeName}`;
  if (params.address) userPrompt += `\n주소: ${params.address}`;

  if (params.confirmedTerms.length > 0) {
    userPrompt += '\n\n확정 번역 용어:';
    for (const term of params.confirmedTerms) {
      userPrompt += `\n- "${term.original}" → "${term.confirmed}"`;
    }
  }

  return userPrompt;
}

export async function retrySingleLocale(
  locale: TranslationLocale,
  params: {
    title: string;
    content: string;
    description: string;
    placeName?: string;
    address?: string;
    confirmedTerms: { original: string; confirmed: string }[];
  },
): Promise<TranslationResult> {
  const userPrompt = buildTranslateUserPrompt(params);
  return translateSingleLocale(locale, userPrompt);
}

export async function translatePost(params: {
  title: string;
  content: string;
  description: string;
  placeName?: string;
  address?: string;
  confirmedTerms: { original: string; confirmed: string }[];
}): Promise<TranslationResult[]> {
  const userPrompt = buildTranslateUserPrompt(params);

  const settled = await Promise.allSettled(
    TARGET_LOCALES.map((locale) => translateSingleLocale(locale, userPrompt)),
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
      failed: true,
    };
  });
}
