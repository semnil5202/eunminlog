import { afterEach, describe, expect, it } from 'vitest';
import { Editor as TiptapEditor, type Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { NodeSelection } from '@tiptap/pm/state';
import {
  createImageAltInput,
  syncImageAltInputs,
  redirectSelectedImageText,
} from '@/features/post-editor/lib/image-alt-input';

afterEach(() => document.body.replaceChildren());

describe('사진 하단 alt 입력', () => {
  it('선택 노드에 들어온 텍스트는 사진을 유지하고 alt로 전달한다', () => {
    const editor = new TiptapEditor({
      extensions: [StarterKit, Image],
      content: '<img src="/photo.webp" />',
    });
    document.body.append(editor.view.dom);
    let alt = '';
    syncImageAltInputs(editor, {
      getAlt: () => alt,
      onChange: (_src, value) => {
        alt = value;
      },
    });
    const field = createImageAltInput(editor, '/photo.webp');
    const photo = editor.view.nodeDOM(0)!;
    const wrapper = document.createElement('div');
    photo.parentNode!.replaceChild(wrapper, photo);
    wrapper.append(photo, field);
    // NodeView 대신 DOM 조회를 고정하여 선택 노드 입력 보호를 검증한다.
    const view = Object.create(editor.view);
    view.nodeDOM = () => wrapper;
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)));
    const before = editor.getHTML();
    expect(redirectSelectedImageText(view, '새 설명')).toBe(true);
    expect(alt).toBe('새 설명');
    expect(editor.getHTML()).toBe(before);
    editor.destroy();
  });
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
