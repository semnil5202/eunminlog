import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import {
  createImageAltInput,
  syncImageAltInputs,
} from '@/features/post-editor/lib/image-alt-input';

afterEach(() => document.body.replaceChildren());

describe('사진 하단 alt 입력', () => {
  it('공통 상태의 공백을 보존하고 같은 URL 입력란을 포커스 손실 없이 갱신한다', () => {
    const dom = document.createElement('div');
    document.body.append(dom);
    const editor = { view: { dom } } as unknown as Editor;
    let alt = '기존 설명';
    const binding = {
      getAlt: () => alt,
      onChange: (_src: string, value: string) => {
        alt = value;
      },
    };
    syncImageAltInputs(editor, binding);
    const first = createImageAltInput(editor, '/one.webp');
    const second = createImageAltInput(editor, '/one.webp');
    first.hidden = false;
    dom.append(first, second);
    const input = first.querySelector('input')!;
    input.focus();
    input.value = '새 설명 ';
    input.dispatchEvent(new Event('input'));
    syncImageAltInputs(editor, binding);
    expect(alt).toBe('새 설명 ');
    expect(second.querySelector('input')!.value).toBe(alt);
    expect(document.activeElement).toBe(input);
  });

  it('한글 조합 중 외부 동기화로 입력을 덮어쓰지 않는다', () => {
    const dom = document.createElement('div');
    const editor = { view: { dom } } as unknown as Editor;
    let alt = '';
    const binding = {
      getAlt: () => alt,
      onChange: (_src: string, value: string) => {
        alt = value;
      },
    };
    syncImageAltInputs(editor, binding);
    const field = createImageAltInput(editor, '/one.webp');
    dom.append(field);
    const input = field.querySelector('input')!;
    input.dispatchEvent(new CompositionEvent('compositionstart'));
    input.value = '한';
    syncImageAltInputs(editor, binding);
    expect(input.value).toBe('한');
    input.dispatchEvent(new CompositionEvent('compositionend'));
    expect(alt).toBe('한');
  });
});
