import { describe, expect, it } from 'vitest';

import { buildImageAltCopyPrompt } from '@/features/post-editor/lib/image-alt-prompt';

describe('buildImageAltCopyPrompt', () => {
  it('본문 이미지 순서를 명시하고 HTML 원본을 유지한다', () => {
    const html =
      '<h2>시그니처 피자</h2><p>한 판 크기를 비교합니다.</p><img src="pizza.webp" /><img src="interior.webp" />';
    const prompt = buildImageAltCopyPrompt('레코드 피자 강남점', html, [
      { label: '본문 이미지 1', src: 'pizza.webp' },
      { label: '본문 이미지 2', src: 'interior.webp' },
    ]);

    expect(prompt).toContain(
      'Alt 입력 대상 (2개):\n1. 본문 이미지 1: pizza.webp\n2. 본문 이미지 2: interior.webp',
    );
    expect(prompt).toContain(`[본문 HTML 시작]\n${html}\n[본문 HTML 끝]`);
    expect(prompt).toContain('Alt 입력 대상 목록에 있는 이미지마다 한 줄씩 작성하세요');
    expect(prompt).toContain('번호·글머리표·라벨·URL·따옴표·해설은 붙이지 마세요');
  });

  it('Alt 입력 대상이 없으면 복사 프롬프트를 만들지 않는다', () => {
    expect(buildImageAltCopyPrompt('제목', '<p>본문</p>', [])).toBeNull();
  });
});
