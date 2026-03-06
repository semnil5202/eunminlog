'use server';

import { openai } from '@/shared/lib/openai';
import { supabaseServer } from '@/shared/lib/supabase-server';

const SUMMARY_SYSTEM_PROMPT = `당신은 한국어 블로그 포스트 요약 전문가입니다.
주어진 블로그 제목과 본문을 읽고, 정확히 3줄로 요약해주세요.

규칙:
- 각 줄은 20~35자 이내로 작성
- 줄바꿈(\\n)으로 구분
- 첫째 줄: 장소/제품의 핵심 특징
- 둘째 줄: 가장 인상적인 포인트
- 셋째 줄: 방문/구매 추천 한줄평
- 이모지, 해시태그 사용 금지
- HTML 태그는 무시하고 텍스트만 참고
- SEO 메타 설명으로도 활용되므로 핵심 키워드 포함`;

const SLUG_SYSTEM_PROMPT = `당신은 URL slug 생성 전문가입니다.
주어진 한국어 텍스트를 기반으로 영문 URL slug 후보 3개를 추천해주세요.

규칙:
- 소문자 영문, 숫자, 하이픈(-)만 사용
- 한국어 제목의 각 단어를 충실히 영어로 번역하고, 띄어쓰기를 하이픈(-)으로 연결
- 제목의 의미를 생략하거나 요약하지 말 것. 원문의 모든 핵심 단어를 포함
- 최대 60자
- 예시: "강남역 숨은 파스타 맛집 베스트 5" → "gangnam-station-hidden-pasta-restaurant-best-5"
- 3개 후보는 번역 표현만 다르게 (동의어, 어순 변형 등)

응답은 반드시 JSON 객체로 작성해주세요. 형식: {"slugs": ["slug-1", "slug-2", "slug-3"]}`;

export async function generateSlugSuggestions(text: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SLUG_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
  });

  const raw = response.choices[0].message.content?.trim() ?? '';
  const parsed = JSON.parse(raw) as { slugs: string[] };

  if (!Array.isArray(parsed.slugs) || parsed.slugs.length === 0) {
    throw new Error('슬러그 추천 결과가 없습니다.');
  }

  return parsed.slugs.slice(0, 3);
}

export async function checkSlugDuplicate(
  slug: string,
  table: 'posts' | 'categories',
  excludeId?: string,
): Promise<boolean> {
  let query = supabaseServer.from(table).select('id', { count: 'exact', head: true }).eq('slug', slug);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { count } = await query;
  return (count ?? 0) > 0;
}

export async function generateSummary(title: string, content: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    messages: [
      { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: `제목: ${title}\n\n본문:\n${content}` },
    ],
  });

  return response.choices[0].message.content?.trim() ?? '';
}
