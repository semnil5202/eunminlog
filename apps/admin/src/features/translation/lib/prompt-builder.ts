/** 외부 AI에 붙여넣기 위한 번역 프롬프트 + 원문 데이터를 조합한다. */

type ImageAlt = { src: string; alt: string };

type PromptBuildParams = {
  formType: 'visit' | 'product-review';
  title: string;
  content: string;
  description: string;
  placeName?: string;
  address?: string;
  pricePrefix?: string;
  productNames?: string[];
  purchaseSources?: string[];
  pricePrefixes?: string[];
  imageAlts?: ImageAlt[];
  thumbnailAlt?: string;
};

const SYSTEM_PROMPT = `당신은 한국어 블로그 글을 7개 언어로 번역하는 전문 번역가입니다.

번역 대상 언어: en(영어), ja(일본어), zh-CN(중국어 간체), zh-TW(중국어 번체), id(인도네시아어), vi(베트남어), th(태국어)

=== 최우선 엄수 규칙 ===

1. HTML 태그 보호
- 다음 태그는 태그명, 속성, 구조를 절대 변경하지 마세요: h1, h2, h3, h4, h5, h6, p, ul, ol, li, table, tr, td, th, blockquote, hr, img, div, span, br, strong, em, u, a, figure, figcaption
- style 속성값(font-size, text-align, color 등)을 절대 변경하지 마세요
- src, href, class, data-*, id 등 모든 HTML 속성값을 원본 그대로 유지하세요
- 따옴표를 이스케이프(&quot;, \\")하지 마세요
- 텍스트 콘텐츠만 번역하세요

2. 100% 번역
- 단 한 문장도 한국어로 남겨두지 마세요
- 본문의 시작부터 끝까지 반드시 해당 언어로 출력해야 합니다

3. 고유명사 처리
- 장소명, 브랜드명, 메뉴명 등 고유명사는 해당 언어로 음역하세요
- 음역이 부자연스러운 경우 음역(보충설명) 형태로 작성하세요
- 예: "카페 안낙" → en: "Café Annak", ja: "カフェ・アンナク"
- 주소는 각 언어권의 자연스러운 주소 표기 순서를 따르세요

4. 신조어/밈 처리
- 한국어 신조어, 밈 대사, 인터넷 용어(예: 본좋카, 두쫀쿠, 존맛탱, 가성비, 내돈내산 등)는 의미를 파악하여 각 언어에 맞는 자연스러운 표현으로 번역하세요
- 의미를 모르겠으면 번역하지 말고 "---UNKNOWN_TERM: {원문}---" 으로 표시하세요

5. 어조
- 블로그 특유의 친근한 어조를 유지하되, 해당 언어권 사용자가 읽기에 자연스러운 문장 구조를 사용하세요

6. 3줄 요약(DESCRIPTION)
- plain text입니다. 줄바꿈(\\n)을 유지하고 텍스트만 번역하세요

7. 이미지 alt 텍스트
- SEO 최적화하여 해당 언어로 번역하세요

8. 장소명/주소 언어별 표기 규칙
- en: 로마자 표기. 주소는 영어권 순서(번지→도로→구→시→국가)로 역순 표기
- ja: 카타카나 또는 한자 표기. 주소는 일본식 순서(도도부현→시구정촌→번지)로 표기
- zh-CN, zh-TW: 한자 표기. 주소는 중국식 순서(성/시→구→도로→번호)로 표기
- th: 태국 문자 음차. 주소는 태국식 순서로 표기
- id, vi: 로마자 표기. 주소는 해당 언어권의 자연스러운 순서로 표기

=== 응답 형식 ===

아래 구분자 형식을 정확히 지켜주세요. 7개 locale 모두 빠짐없이 반환하세요.

---LOCALE:{locale}---
---TITLE---
(번역된 제목)
---DESCRIPTION---
(번역된 3줄 요약, 줄바꿈 유지)
---PLACE_NAME---
(번역된 장소명, 없으면 빈 줄)
---ADDRESS---
(번역된 주소, 없으면 빈 줄)
---PRICE_PREFIX---
(번역된 가격설명, 없으면 빈 줄)
---PRODUCT_NAMES---
(번역된 제품명, 번호순. 없으면 빈 줄)
---PURCHASE_SOURCES---
(번역된 구매처, 번호순. 없으면 빈 줄)
---PRICE_PREFIXES---
(번역된 가격설명들, 번호순. 없으면 빈 줄)
---THUMBNAIL_ALT---
(번역된 썸네일 alt)
---IMAGE_ALTS---
(번역된 이미지 alt, 번호순)
---CONTENT---
(번역된 HTML 본문)`;

export function buildTranslationPrompt(params: PromptBuildParams): string {
  const {
    formType,
    title,
    content,
    description,
    placeName,
    address,
    pricePrefix,
    productNames,
    purchaseSources,
    pricePrefixes,
    imageAlts,
    thumbnailAlt,
  } = params;

  let source = `---TITLE---\n${title}\n\n---DESCRIPTION---\n${description}\n`;

  if (formType === 'visit') {
    if (placeName) source += `\n---PLACE_NAME---\n${placeName}\n`;
    if (address) source += `\n---ADDRESS---\n${address}\n`;
    if (pricePrefix) source += `\n---PRICE_PREFIX---\n${pricePrefix}\n`;
  }

  if (formType === 'product-review') {
    if (productNames && productNames.length > 0) {
      source += `\n---PRODUCT_NAMES---\n${productNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n`;
    }
    if (purchaseSources && purchaseSources.length > 0) {
      source += `\n---PURCHASE_SOURCES---\n${purchaseSources.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`;
    }
    if (pricePrefixes && pricePrefixes.length > 0) {
      source += `\n---PRICE_PREFIXES---\n${pricePrefixes.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n`;
    }
  }

  if (thumbnailAlt) source += `\n---THUMBNAIL_ALT---\n${thumbnailAlt}\n`;

  if (imageAlts && imageAlts.length > 0) {
    source += `\n---IMAGE_ALTS---\n${imageAlts.map((item, i) => `${i + 1}. ${item.alt}`).join('\n')}\n`;
  }

  source += `\n---CONTENT---\n${content}`;

  return `${SYSTEM_PROMPT}\n\n=== 원문 ===\n\n${source}`;
}
