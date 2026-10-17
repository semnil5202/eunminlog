import { describe, expect, it } from 'vitest';

import { buildSummaryCopyPrompt } from '@/features/post-editor/lib/summary-prompt';

describe('buildSummaryCopyPrompt', () => {
  it('Tiptap HTML을 가공하지 않고 프롬프트에 포함한다', () => {
    const html = [
      '<h2 style="font-weight: 600">공공분양</h2>',
      '<p>월 25만원까지 인정됩니다.</p>',
      '<table><tr><th>기간</th><th>인정액</th></tr><tr><td>1년</td><td>300만원</td></tr></table>',
      '<aside data-type="link-bookmark"><p>관련 자료</p></aside>',
    ].join('');

    const prompt = buildSummaryCopyPrompt('청약통장 10만원 vs 25만원', html);

    expect(prompt).toContain('제목: 청약통장 10만원 vs 25만원');
    expect(prompt).toContain(`[본문 HTML 시작]\n${html}\n[본문 HTML 끝]`);
  });

  it('실제 본문 텍스트가 없으면 복사 프롬프트를 만들지 않는다', () => {
    expect(buildSummaryCopyPrompt('제목', '<p></p><img src="image.webp" alt="사진" />')).toBeNull();
  });
});
