import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

type AltBinding = {
  getAlt: (src: string) => string;
  onChange: (src: string, alt: string) => void;
};

const bindings = new WeakMap<Editor, AltBinding>();

/** 이미지 선택 후 레이아웃 스크롤 없이 설명 입력으로 이동한다. */
export function focusImageAltInput(root: HTMLElement) {
  queueMicrotask(() => {
    if (!root.isConnected) return;
    root
      .querySelector<HTMLInputElement>('.image-alt-field:not([hidden]) input')
      ?.focus({ preventScroll: true });
  });
}

/** 선택된 이미지 노드를 텍스트로 교체하지 않고 설명 입력으로 전달한다. */
export function redirectSelectedImageText(view: EditorView, text: string): boolean {
  const selection = view.state.selection;
  if (
    !(selection instanceof NodeSelection) ||
    !['image', 'imageCarousel'].includes(selection.node.type.name)
  )
    return false;
  const root = view.nodeDOM(selection.from);
  if (!(root instanceof HTMLElement)) return true;
  const field =
    root.querySelector<HTMLElement>('.image-alt-field:not([hidden])') ??
    root.querySelector<HTMLElement>('.image-alt-field');
  const input = field?.querySelector('input');
  if (!field || !input) return true;
  field.hidden = false;
  input.focus({ preventScroll: true });
  input.setRangeText(
    text,
    input.selectionStart ?? input.value.length,
    input.selectionEnd ?? input.value.length,
    'end',
  );
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

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
