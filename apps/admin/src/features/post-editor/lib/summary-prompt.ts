import { SUMMARY_SYSTEM_PROMPT } from '@/shared/constants/prompts';

/** 에디터 HTML 원본을 포함한 3줄 요약용 복사 프롬프트를 만든다. */
export function buildSummaryCopyPrompt(title: string, html: string): string | null {
  const document = new DOMParser().parseFromString(html, 'text/html');
  if (!document.body.textContent?.trim()) return null;

  return `${SUMMARY_SYSTEM_PROMPT}\n\n제목: ${title}\n\n[본문 HTML 시작]\n${html}\n[본문 HTML 끝]`;
}
