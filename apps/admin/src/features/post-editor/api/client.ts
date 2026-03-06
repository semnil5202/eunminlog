import { openai } from '@/shared/lib/openai';

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
- SEO 메타 설명으로도 활용되므로 핵심 키워드 포함
- 반드시 자연스러운 한국어 띄어쓰기를 지켜 작성 (단어를 붙여 쓰지 말 것)
- 각 줄은 완성형 문장(~다, ~요, ~음 등)으로 마무리할 것`;

const SLUG_SYSTEM_PROMPT = `당신은 URL slug 생성 전문가입니다.
주어진 한국어 텍스트를 기반으로 영문 URL slug 후보 3개를 추천해주세요.

규칙:
- 소문자 영문, 숫자, 하이픈(-)만 사용
- 2~4단어, 최대 40자
- SEO 친화적이고 의미가 명확한 slug
- 한국어 의미를 잘 반영하되, 직역보다 자연스러운 영어 표현 선호

응답은 반드시 JSON 객체로 작성해주세요. 형식: {"slugs": ["slug-1", "slug-2", "slug-3"]}`;

export async function streamSummary(
  title: string,
  content: string,
  onChunk: (text: string) => void,
): Promise<string> {
  const stream = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    stream: true,
    messages: [
      { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: `제목: ${title}\n\n본문:\n${content}` },
    ],
  });

  let fullText = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) {
      fullText += text;
      onChunk(fullText);
    }
  }

  return fullText;
}

export async function fetchSlugSuggestions(text: string): Promise<string[]> {
  const stream = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    response_format: { type: 'json_object' },
    stream: true,
    messages: [
      { role: 'system', content: SLUG_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
  });

  let fullText = '';
  for await (const chunk of stream) {
    fullText += chunk.choices[0]?.delta?.content ?? '';
  }

  const parsed = JSON.parse(fullText) as { slugs: string[] };
  if (!Array.isArray(parsed.slugs) || parsed.slugs.length === 0) {
    throw new Error('슬러그 추천 결과가 없습니다.');
  }

  return parsed.slugs.slice(0, 3);
}
