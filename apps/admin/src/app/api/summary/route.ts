import OpenAI from 'openai';

export const runtime = 'edge';

const SYSTEM_PROMPT = `당신은 한국어 블로그 포스트 요약 전문가입니다.
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

export async function POST(request: Request) {
  const { title, content } = (await request.json()) as { title: string; content: string };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    stream: true,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `제목: ${title}\n\n본문:\n${content}` },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
