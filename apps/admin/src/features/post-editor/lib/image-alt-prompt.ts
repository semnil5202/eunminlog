type ImageAltTarget = {
  label: string;
  src: string;
};

const IMAGE_ALT_SYSTEM_PROMPT = `당신은 한국어 블로그 게시글의 이미지 대체 텍스트(alt)를 작성합니다.
아래의 글 제목, 에디터 본문 HTML 원본, Alt 입력 대상 목록을 읽고 각 이미지의 alt를 제안하세요.

규칙:
- 대상 목록은 드로어의 본문 이미지 1번부터 실제 입력 순서입니다. 썸네일은 제외하고 Alt 입력 대상 목록에 있는 이미지마다 한 줄씩 작성하세요.
- 각 본문 이미지는 HTML에서 해당 img의 위치를 찾고 가까운 제목·앞뒤 문단·표·목록을 읽어 문맥을 파악하세요.
- alt는 이미지를 보지 못하는 사람이 그 이미지의 핵심 내용과 글 속 역할을 이해할 수 있는 짧고 구체적인 표현으로 작성하세요. 간결한 명사구를 기본으로 하되, 동작이나 관계를 설명해야 정확하다면 짧은 완성형 문장을 사용하세요.
- 매장명·브랜드·지역명 같은 고유명사는 해당 이미지를 식별하는 데 필요하고 본문에서 확인될 때 자연스럽게 포함하세요. 모든 줄에 같은 검색어를 반복하거나 무관한 키워드를 덧붙이지 마세요. 막연한 "맛있어 보이는 피자"보다 확인 가능한 구체적 대상과 특징을 우선하세요.
- HTML의 URL·파일명·기존 alt와 주변 글만으로 이미지의 실제 모습이 확실하지 않다면 색상·재료·크기·구도·맛을 추측하지 마세요. 내용을 특정할 근거가 부족한 대상은 해당 줄에 "이미지 확인 필요"라고만 쓰세요. 결과를 입력하기 전 사용자가 미리보기와 대조합니다.
- 출력은 대상 수와 정확히 같은 줄 수로, 대상 순서대로 alt 내용만 한 줄씩 작성하세요. 번호·글머리표·라벨·URL·따옴표·해설은 붙이지 마세요. 각 줄을 다른 입력란에 그대로 붙여넣을 수 있어야 합니다.`;

/** 드로어의 이미지 순서와 원본 HTML을 포함한 alt 작성용 복사 프롬프트를 만든다. */
export function buildImageAltCopyPrompt(
  title: string,
  html: string,
  targets: ImageAltTarget[],
): string | null {
  if (targets.length === 0) return null;

  const targetList = targets
    .map(({ label, src }, index) => `${index + 1}. ${label}: ${src}`)
    .join('\n');

  return `${IMAGE_ALT_SYSTEM_PROMPT}\n\n글 제목: ${title}\n\nAlt 입력 대상 (${targets.length}개):\n${targetList}\n\n[본문 HTML 시작]\n${html}\n[본문 HTML 끝]`;
}
