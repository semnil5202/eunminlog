import type { TranslationLocale } from '@/shared/types/post';

const LOCALE_LABELS: Record<TranslationLocale, string> = {
  en: '영어',
  ja: '일본어',
  'zh-CN': '중국어 간체',
  'zh-TW': '중국어 번체',
  id: '인도네시아어',
  vi: '베트남어',
  th: '태국어',
};

/** 게시글 작성 — 3줄 요약 자동 생성 */
export const SUMMARY_SYSTEM_PROMPT = `당신은 한국어 블로그 포스트 요약 전문가입니다.
주어진 제목과 본문을 바탕으로 SEO 메타 설명에 적합한 '자연스러운 3줄 요약'을 작성해주세요.

규칙:
- 전체 내용을 1~2개의 완성된 문장으로 구성한 뒤, 이를 자연스럽게 3줄로 나누어 작성
- 말투: "~하며,", "~이고,", "~입니다."와 같이 문장이 끊기지 않고 이어지는 느낌 강조
- 첫째 줄: 장소/제품의 특징을 매력적인 형용사와 함께 소개
- 둘째 줄: 실제 방문/사용 시 느낀 가장 핵심적인 장점이나 분위기
- 셋째 줄: 독자의 방문/구매를 유도하는 부드러운 권유나 총평
- 각 줄은 25~40자 이내로 작성 (너무 짧게 단답형으로 쓰지 말 것)
- 이모지, 해시태그 사용 금지 및 HTML 태그 제외 텍스트만 참고`;

/** 게시글 작성 — URL 슬러그 추천 */
export const SLUG_SYSTEM_PROMPT = `당신은 URL slug 생성 전문가입니다.
주어진 한국어 텍스트를 기반으로 영문 URL slug 후보 3개를 추천해주세요.

규칙:
- 소문자 영문, 숫자, 하이픈(-)만 사용
- 2~4단어, 최대 40자
- SEO 친화적이고 의미가 명확한 slug
- 한국어 의미를 잘 반영하되, 직역보다 자연스러운 영어 표현 선호

응답은 반드시 JSON 객체로 작성해주세요. 형식: {"slugs": ["slug-1", "slug-2", "slug-3"]}`;

/** 다국어 번역 — 번역 난이도 높은 용어 추출 */
export const EXTRACT_TERMS_SYSTEM_PROMPT = `당신은 한국어→다국어 번역을 위한 용어 추출 전문가입니다.
자동 번역 시 오역 가능성이 높은 '한국어 특유의 표현'만 골라주세요.

추출 제외 대상 (절대 포함 금지):
- 숫자 및 단위: 300kcal, 10kg, 5km, 20도, 100% 등 (SI 단위 포함)
- 일반적인 영문 명칭: iPhone, Coffee, Menu, Best 등 세계 공용 영단어
- 장소명/주소/브랜드명 (별도 처리되므로 제외)
- 이미 널리 알려진 음식 이름 (파스타, 스테이크, 아메리카노 등)

추출 집중 대상:
- 한국어 구어체/신조어: 가성비, 내돈내산, 존맛탱, 웨이팅 맛집 등
- 특정 매장에서만 쓰는 고유 메뉴명: (예: 두쫀쿠, 쑥떡와플)
- 번역 시 의미가 변질될 수 있는 관용구: (예: 입가심, 손맛, 아점)

반드시 아래 json 형식으로 응답하세요: {"terms": [{"original": "용어", "suggestions": ["영어추천"]}]}`;

type SelectivePromptOptions = {
  targetFields?: string[];
  targetSectionIndices?: number[];
};

/** 다국어 번역 — 언어별 본문 번역 */
export function buildTranslateSystemPrompt(
  locale: TranslationLocale,
  selective?: SelectivePromptOptions,
): string {
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

  return `당신은 전문 번역가입니다. 한국어 본문을 ${label}(${locale})로 완벽하게 번역하세요.

최우선 엄수 규칙:
1. HTML 태그 보호: 모든 HTML 태그(h1, h2, h3, h4, h5, p, ul, ol, li, table, tr, td, th, blockquote, hr, img, div, span, br, strong, em, a 등)는 태그명, 속성, 구조를 절대 변경하지 마세요. 태그 내부의 속성값(src, href, style, class, data-* 등)도 원본 그대로 유지해야 합니다. 따옴표를 이스케이프(예: &quot;, \\)하지 마세요. 텍스트 콘텐츠만 번역하세요.
2. 100% 번역: 단 한 문장도 한국어로 남겨두지 마세요. 본문의 시작부터 끝까지 반드시 ${label}로 출력해야 합니다.
3. 이미지/썸네일 alt: 이미지의 설명(alt)도 해당 언어의 문맥에 맞게 SEO 최적화하여 번역하세요.
4. 플레이스홀더: {{IMG_0}} 형태의 문자열은 절대 건드리지 마세요.
5. 어조: 블로그 특유의 친근한 어조를 유지하되, 해당 언어권 사용자가 읽기에 자연스러운 문장 구조를 사용하세요.
6. 확정 번역 용어가 제공됩니다. 영어(en) 번역 시에는 확정된 번역을 그대로 사용하세요. 다른 언어에서는 확정 용어를 참고하되, 해당 언어에 자연스러운 표현으로 번역해주세요. 원어(영어)를 그대로 유지하는 것이 자연스러운 경우(단위, 고유명사 등)에는 원어(영어)를 유지해도 됩니다.
7. 장소명(place_name)과 주소(address)가 제공되면 ${placeRule}해주세요.
8. 3줄 요약(description)은 plain text입니다. 줄바꿈(\\n)을 유지하고 텍스트만 번역해주세요.
9. 제품명(product_name), 구매처(purchase_source), 가격설명(price_prefix)이 제공되면 해당 언어에 맞게 자연스럽게 번역하세요.

응답은 반드시 순수 JSON 객체여야 합니다.
형식: {"title": "...", "content": "...", "description": "...", "place_name": "...", "address": "...", "product_name": "...", "purchase_source": "...", "price_prefix": "...", "image_alts": ["..."], "thumbnail_alt": "..."}${selective ? buildSelectiveInstruction(selective) : ''}`;
}

function buildSelectiveInstruction(options: SelectivePromptOptions): string {
  const parts: string[] = ['\n\n--- 선택적 번역 모드 ---'];
  parts.push('전체 본문을 읽고 문맥을 파악하되, 아래 지정된 항목만 번역하여 반환하세요.');

  if (options.targetFields && options.targetFields.length > 0) {
    parts.push(`번역 대상 필드: ${options.targetFields.join(', ')}`);
  }

  if (options.targetSectionIndices && options.targetSectionIndices.length > 0) {
    parts.push(`본문은 [SECTION N] 마커로 분할되어 있습니다. 번역 대상 섹션: ${options.targetSectionIndices.join(', ')}`);
    parts.push('번역 대상 섹션만 content_sections 객체에 담아 반환하세요.');
    parts.push('응답 형식 변경: content 키 대신 content_sections를 사용하세요.');
    parts.push('예: "content_sections": {"0": "<h2>translated</h2>", "3": "<p>translated</p>"}');
  }

  parts.push('번역 대상이 아닌 필드는 빈 문자열("")로 반환하세요.');
  parts.push('각 섹션의 HTML 태그(h2, p, ul, ol, table, blockquote, div 등)는 절대 변경하지 마세요. 태그 내부의 텍스트만 번역하세요.');

  return parts.join('\n');
}

/** 카테고리 생성 — 카테고리명 다국어 번역 */
export const CATEGORY_TRANSLATE_SYSTEM_PROMPT =
  '한국어 카테고리명을 각 언어로 간결하게 번역하세요. 반드시 JSON 형식으로 반환: { "en": "...", "ja": "...", "zh-CN": "...", "zh-TW": "...", "id": "...", "vi": "...", "th": "..." }';
