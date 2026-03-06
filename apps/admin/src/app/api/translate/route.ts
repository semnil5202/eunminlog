import OpenAI from 'openai';

import type { TranslationLocale } from '@/shared/types/post';

export const runtime = 'edge';

const LOCALE_LABELS: Record<TranslationLocale, string> = {
  en: '영어',
  ja: '일본어',
  'zh-CN': '중국어 간체',
  'zh-TW': '중국어 번체',
  id: '인도네시아어',
  vi: '베트남어',
  th: '태국어',
};

function buildSystemPrompt(locale: TranslationLocale): string {
  const label = LOCALE_LABELS[locale];

  let placeRule = '';
  if (locale === 'ja')
    placeRule = '카타카나 또는 한자 표기. 주소는 일본식 순서(도도부현→시구정촌→번지)로 표기';
  else if (locale === 'zh-CN' || locale === 'zh-TW')
    placeRule = '한자 표기. 주소는 중국식 순서(성/시→구→도로→번호)로 표기';
  else if (locale === 'th')
    placeRule = '태국 문자 음차 또는 원어 유지. 주소는 태국식 순서로 표기';
  else if (locale === 'en')
    placeRule = '로마자 표기. 주소는 영어권 순서(번지→도로→구→시→국가)로 역순 표기';
  else placeRule = '로마자 표기. 주소는 해당 언어권의 자연스러운 순서로 표기';

  return `당신은 한국어 블로그 포스트를 ${label}(${locale})로 번역하는 전문 번역가입니다.

번역 규칙:
1. 본문(content)은 HTML 형식입니다. 아래 HTML 태그는 절대 번역하거나 제거하지 마세요. 태그 구조와 속성을 그대로 유지하고 텍스트만 번역해주세요.
   보존 필수 태그: <p>, <br>, <strong>, <em>, <s>, <u>, <a>, <h2>, <h3>, <h4>, <h5>, <h6>, <ul>, <ol>, <li>, <blockquote>, <hr>, <img>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <div>, <span>
   [중요] <img> 태그는 src, style 등 모든 속성값을 원본 그대로 유지해야 합니다. 속성값의 따옴표를 이스케이프(\\"나 &quot;)하거나 속성 구조를 변형하지 마세요. 입력된 <img> 태그를 수정 없이 그대로 출력하세요.
2. 3줄 요약(description)은 plain text입니다. 줄바꿈(\\n)을 유지하고 텍스트만 번역해주세요.
3. 확정 번역 용어가 제공되면 반드시 해당 번역을 사용해주세요.
4. 장소명(place_name)과 주소(address)가 제공되면 ${placeRule}해주세요.
5. 블로그의 친근한 어조를 유지하되, ${label}의 자연스러운 표현을 사용해주세요.
6. 한국 고유 문화 용어는 의역하되 괄호 안에 원어를 병기할 수 있습니다.
7. 이미지 alt 텍스트가 제공되면 각각 번역해주세요. 이미지 설명은 간결하고 SEO에 효과적인 표현으로 번역해주세요.
8. 썸네일 alt 텍스트가 제공되면 번역해주세요. 간결하고 SEO에 효과적인 표현으로 번역해주세요.

응답은 반드시 JSON 객체로 작성해주세요. 형식: {"title": "...", "content": "...", "description": "...", "place_name": "...", "address": "...", "image_alts": ["..."], "thumbnail_alt": "..."}
place_name과 address는 입력에 포함된 경우에만 응답에 포함해주세요.
image_alts는 입력에 포함된 경우에만 응답에 포함하며, 입력 순서와 동일한 순서로 번역해주세요.
thumbnail_alt는 입력에 포함된 경우에만 응답에 포함해주세요.`;
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

type TranslateBody = {
  locale: TranslationLocale;
  title: string;
  content: string;
  description: string;
  placeName?: string;
  address?: string;
  confirmedTerms: { original: string; confirmed: string }[];
  imageAlts?: { src: string; alt: string }[];
  thumbnailAlt?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as TranslateBody;
  const { locale, title, content, description, placeName, address, confirmedTerms, imageAlts, thumbnailAlt } = body;

  let userPrompt = `제목: ${title}\n\n본문:\n${content}\n\n3줄 요약:\n${description}`;
  if (placeName) userPrompt += `\n\n장소명: ${placeName}`;
  if (address) userPrompt += `\n주소: ${address}`;

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

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    response_format: { type: 'json_object' },
    stream: true,
    messages: [
      { role: 'system', content: buildSystemPrompt(locale) },
      { role: 'user', content: userPrompt },
    ],
  });

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

  return Response.json({
    locale,
    title: (parsed.title as string) ?? '',
    content: (parsed.content as string) ?? '',
    description: (parsed.description as string) ?? '',
    place_name: (parsed.place_name as string) ?? '',
    address: (parsed.address as string) ?? '',
    image_alts: resultImageAlts,
    thumbnail_alt: (parsed.thumbnail_alt as string) ?? '',
  });
}
