import type { Editor } from '@tiptap/core';

type AltBinding = {
  getAlt: (src: string) => string;
  onChange: (src: string, alt: string) => void;
};

const bindings = new WeakMap<Editor, AltBinding>();

/** NodeView 입력을 폼의 기존 alt 상태와 연결한다. */
export function syncImageAltInputs(editor: Editor, binding: AltBinding) {
  bindings.set(editor, binding);
  editor.view.dom.querySelectorAll<HTMLInputElement>('[data-image-alt-src]').forEach((input) => {
    const value = binding.getAlt(input.dataset.imageAltSrc!);
    if (input.dataset.composing !== 'true' && input.value !== value) input.value = value;
  });
}

/** 사진 선택 시 표시할 설명 입력란을 생성한다. */
export function createImageAltInput(editor: Editor, src: string, name = '이미지 설명 (alt)') {
  const field = document.createElement('label');
  field.className = 'image-alt-field';
  field.contentEditable = 'false';
  field.hidden = true;
  const label = document.createElement('span');
  label.textContent = name;
  const input = document.createElement('input');
  input.type = 'text';
  input.dataset.imageAltSrc = src;
  input.setAttribute('aria-label', name);
  input.placeholder = '사진을 설명해주세요';
  input.value = bindings.get(editor)?.getAlt(src) ?? '';
  input.addEventListener('input', () => bindings.get(editor)?.onChange(src, input.value));
  input.addEventListener('compositionstart', () => {
    input.dataset.composing = 'true';
  });
  input.addEventListener('compositionend', () => {
    delete input.dataset.composing;
    bindings.get(editor)?.onChange(src, input.value);
  });
  field.append(label, input);
  return field;
}
