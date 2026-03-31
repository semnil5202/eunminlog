/** 외부 AI에 붙여넣기 위한 번역 프롬프트 + 원문 데이터를 조합한다. */

type ImageAlt = { src: string; alt: string };

export type PromptVariant = 'claude' | 'gpt' | 'gemini';

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

function buildResponseFormat(params: PromptBuildParams): string {
  const fields: string[] = [
    '---TITLE---\n(번역된 제목)',
    '---DESCRIPTION---\n(번역된 3줄 요약, 줄바꿈 유지)',
  ];

  if (params.formType === 'visit') {
    if (params.placeName) fields.push('---PLACE_NAME---\n(번역된 장소명)');
    if (params.address) fields.push('---ADDRESS---\n(번역된 주소)');
    if (params.pricePrefix) fields.push('---PRICE_PREFIX---\n(번역된 가격설명)');
  }

  if (params.formType === 'product-review') {
    if (params.productNames && params.productNames.length > 0)
      fields.push('---PRODUCT_NAMES---\n(번역된 제품명, 번호순)');
    if (params.purchaseSources && params.purchaseSources.length > 0)
      fields.push('---PURCHASE_SOURCES---\n(번역된 구매처, 번호순)');
    if (params.pricePrefixes && params.pricePrefixes.length > 0)
      fields.push('---PRICE_PREFIXES---\n(번역된 가격설명들, 번호순)');
  }

  if (params.thumbnailAlt) fields.push('---THUMBNAIL_ALT---\n(번역된 썸네일 alt)');
  if (params.imageAlts && params.imageAlts.length > 0)
    fields.push('---IMAGE_ALTS---\n(번역된 이미지 alt, 번호순)');

  fields.push('---CONTENT---\n(번역된 HTML 본문)');

  return `---LOCALE:{locale}---\n${fields.join('\n')}`;
}

function getVariantRules(variant: PromptVariant): string {
  if (variant === 'gpt') {
    return `
=== GPT 전용 규칙 ===

- 한 번에 1개 locale만 출력하세요. 첫 요청에는 ---LOCALE:en--- 만 출력하세요
- 사용자가 "다음" 또는 "이어서"라고 요청하면, 다음 locale 1개만 출력하세요
- locale 순서: en → ja → zh-CN → zh-TW → id → vi → th
- "네", "알겠습니다", "계속하겠습니다" 등의 대답은 절대 하지 마세요. 바로 ---LOCALE:{locale}---부터 출력하세요
- 각 locale 출력이 끝나면 즉시 멈추세요. 다음 locale을 이어서 출력하지 마세요`;
  }

  if (variant === 'gemini') {
    return `
=== Gemini 전용 규칙 ===

- 복사 버튼으로 복사될 텍스트에 백슬래시(\\)를 포함하지 마세요
- Markdown 이스케이프(\\*, \\", \\\\, \\- 등)를 사용하지 마세요. 순수 텍스트와 HTML 태그만 출력하세요`;
  }

  return '';
}

export function buildTranslationPrompt(
  params: PromptBuildParams,
  variant: PromptVariant = 'claude',
): string {
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

  const systemPrompt = `당신은 한국어 블로그 글을 7개 언어로 번역하는 전문 번역가입니다.

번역 대상 언어: en(영어), ja(일본어), zh-CN(중국어 간체), zh-TW(중국어 번체), id(인도네시아어), vi(베트남어), th(태국어)

=== 최우선 엄수 규칙 ===

1. HTML 태그 보호
- 다음 태그는 태그명, 속성, 구조를 절대 변경하지 마세요: h1, h2, h3, h4, h5, h6, p, ul, ol, li, table, tr, td, th, blockquote, hr, img, div, span, br, strong, em, u, a, figure, figcaption 등
- style 속성값(font-size, text-align, color 등)을 절대 변경하지 마세요
- src, href, class, data-*, id 등 모든 HTML 속성값을 원본 그대로 유지하세요
- 따옴표를 이스케이프(&quot;, \\")하지 마세요
- 텍스트 콘텐츠만 번역하세요

2. 100% 번역
- 단 한 문장도 한국어로 남겨두지 마세요
- 본문의 시작부터 끝까지 반드시 해당 언어로 출력해야 합니다

3. 고유명사 처리
- 장소명, 브랜드명, 메뉴명 등 고유명사는 해당 언어로 음역하세요
- 음역이 부자연스러운 경우 "음역(보충설명)" 형태로 작성하세요
- 예: "카페 안낙" → en: "Café Annac", ja: "カフェ・アンナク"

4. 신조어/밈 처리
- 한국어 신조어, 밈 대사, 인터넷 용어(예: 본좋카, 두쫀쿠, 존맛탱, 가성비, 내돈내산 등)는 웹 검색을 통해 의미를 파악하고 각 언어에 맞는 자연스러운 표현으로 번역하세요
- 웹 검색으로도 의미를 알 수 없는 용어는 번역 전에 사용자에게 직접 의미를 확인해주세요. 오타일 가능성도 있습니다

5. 어조
- 블로그 특유의 친근한 어조를 유지하되, 해당 언어권 사용자가 읽기에 자연스러운 문장 구조를 사용하세요

6. 이미지 alt 텍스트
- SEO 최적화하여 해당 언어로 번역하세요

7. 장소명/주소/시간/날짜 표기 규칙
- en: 로마자 표기. 주소는 영어권 순서(번지→도로→구→시→국가)로 역순 표기. 시간은 12시간제(AM/PM), 날짜는 Month DD, YYYY
- ja: 카타카나 또는 한자 표기. 주소는 일본식 순서(도도부현→시구정촌→번지)로 표기. 시간은 24시간제, 날짜는 YYYY年MM月DD日
- zh-CN, zh-TW: 한자 표기. 주소는 중국식 순서(성/시→구→도로→번호)로 표기. 시간은 24시간제, 날짜는 YYYY年MM月DD日
- th: 태국 문자 음차. 주소는 태국식 순서로 표기. 날짜는 태국식(DD เดือน YYYY)
- id: 로마자 표기. 주소는 인도네시아식 순서로 표기. 날짜는 DD Bulan YYYY
- vi: 로마자 표기. 주소는 베트남식 순서로 표기. 날짜는 DD tháng MM năm YYYY

=== 출력 규칙 ===

- 설명, 인사, 이모지, 요약, 마무리 멘트 등 번역 결과 외의 텍스트를 절대 출력하지 마세요
- ---LOCALE:en---부터 바로 시작하고, 마지막 locale의 CONTENT가 끝나면 즉시 종료하세요
- 원문에 없는 필드를 추가하지 마세요. 아래 응답 형식에 명시된 필드만 반환하세요
${getVariantRules(variant)}
=== 응답 형식 ===

아래 구분자 형식을 정확히 지켜주세요. 7개 locale 모두 빠짐없이 반환하세요.

${buildResponseFormat(params)}`;

  let source = `---TITLE---\n${title}\n\n---DESCRIPTION---\n${description}`;

  if (formType === 'visit') {
    if (placeName) source += `\n\n---PLACE_NAME---\n${placeName}`;
    if (address) source += `\n\n---ADDRESS---\n${address}`;
    if (pricePrefix) source += `\n\n---PRICE_PREFIX---\n${pricePrefix}`;
  }

  if (formType === 'product-review') {
    if (productNames && productNames.filter(Boolean).length > 0) {
      source += `\n\n---PRODUCT_NAMES---\n${productNames
        .filter(Boolean)
        .map((n, i) => `${i + 1}. ${n}`)
        .join('\n')}`;
    }
    if (purchaseSources && purchaseSources.filter(Boolean).length > 0) {
      source += `\n\n---PURCHASE_SOURCES---\n${purchaseSources
        .filter(Boolean)
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n')}`;
    }
    if (pricePrefixes && pricePrefixes.filter(Boolean).length > 0) {
      source += `\n\n---PRICE_PREFIXES---\n${pricePrefixes
        .filter(Boolean)
        .map((p, i) => `${i + 1}. ${p}`)
        .join('\n')}`;
    }
  }

  if (thumbnailAlt) source += `\n\n---THUMBNAIL_ALT---\n${thumbnailAlt}`;

  if (imageAlts && imageAlts.filter((a) => a.alt).length > 0) {
    source += `\n\n---IMAGE_ALTS---\n${imageAlts
      .filter((a) => a.alt)
      .map((item, i) => `${i + 1}. ${item.alt}`)
      .join('\n')}`;
  }

  source += `\n\n---CONTENT---\n${content}`;

  return `${systemPrompt}\n\n=== 원문 ===\n\n${source}`;
}
