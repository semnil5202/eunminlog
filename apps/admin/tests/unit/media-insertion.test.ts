import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { tiptapExtensions } from '@/features/post-editor/configs/tiptap-extensions';
import { captureMediaTarget, insertMedia } from '@/features/post-editor/lib/media-insertion';

const editors: Editor[] = [];
const uploads = [
  { url: '/one.webp', width: 688, height: 400 },
  { url: '/two.webp', width: 688, height: 500 },
];
const carousel =
  '<div data-type="image-carousel"><img src="/old.webp" data-width="72%" data-height="ratio:1.5"></div>';
function make(content = '<p>before after</p>') {
  const editor = new Editor({ extensions: tiptapExtensions, content });
  editors.push(editor);
  return editor;
}
afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
});

describe('미디어 삽입 정책', () => {
  it('업로드 중 이동한 선택 영역을 매핑하고 강제 스크롤하지 않는다', () => {
    const editor = make('<p>first</p><p>second</p>');
    editor.commands.setTextSelection({ from: 9, to: 12 });
    const selected = editor.state.doc.textBetween(9, 12);
    const scrolls: boolean[] = [];
    editor.on('transaction', ({ transaction }) => scrolls.push(transaction.scrolledIntoView));
    insertMedia(editor, 2, uploads, 'images');
    const { from, to } = editor.state.selection;
    expect(editor.state.doc.textBetween(from, to)).toBe(selected);
    expect(scrolls.some(Boolean)).toBe(false);
  });
  it('복수 일반 이미지는 인접 이미지와 병합하지 않고 각각 삽입한다', () => {
    const editor = make('<p><img src="/existing.webp"></p>');
    expect(insertMedia(editor, 2, uploads, 'images')).toBe(true);
    expect(editor.getHTML().match(/<img /g)).toHaveLength(3);
    expect(editor.getHTML()).not.toContain('image-carousel');
  });
  it('선택 텍스트를 삭제하지 않고 문단 중간에 캐러셀을 넣는다', () => {
    const editor = make();
    editor.commands.setTextSelection({ from: 7, to: 12 });
    expect(insertMedia(editor, 7, uploads, 'carousel')).toBe(true);
    expect(editor.state.doc.textContent).toBe('before after');
    expect(editor.getJSON().content?.map((node) => node.type)).toEqual([
      'paragraph',
      'imageCarousel',
      'paragraph',
    ]);
  });
  it.each([
    '<ul><li><p>before after</p></li></ul>',
    '<table><tbody><tr><td><p>before after</p></td></tr></tbody></table>',
  ])('중첩 블록에서 텍스트와 문서 유효성을 보존한다: %s', (content) => {
    const editor = make(content);
    let pos = 0;
    editor.state.doc.descendants((node, at) => {
      if (node.isText && !pos) pos = at + 6;
    });
    expect(insertMedia(editor, pos, uploads, 'carousel')).toBe(true);
    expect(editor.state.doc.textContent).toBe('before after');
    expect(() => editor.state.doc.check()).not.toThrow();
    expect(editor.getHTML()).toContain('image-carousel');
  });
  it('캐러셀 선택 중 일반 이미지는 뒤에 독립 삽입한다', () => {
    const editor = make(carousel);
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)));
    const target = captureMediaTarget(editor, 'insert');
    insertMedia(editor, target.resolve()!, uploads, 'images');
    expect(editor.state.doc.firstChild?.attrs.images).toHaveLength(1);
    expect(
      editor
        .getJSON()
        .content?.slice(0, 3)
        .map((node) => node.type),
    ).toEqual(['imageCarousel', 'paragraph', 'paragraph']);
    expect(editor.getHTML().match(/<img /g)).toHaveLength(3);
    target.dispose();
  });
  it('생성 2장 조건을 강제하고 한 번의 Undo/Redo로 일괄 삽입을 복원한다', () => {
    const editor = make();
    const before = editor.getHTML();
    expect(insertMedia(editor, 1, uploads.slice(0, 1), 'carousel')).toBe(false);
    expect(insertMedia(editor, 1, uploads, 'carousel')).toBe(true);
    const after = editor.getHTML();
    editor.commands.undo();
    expect(editor.getHTML()).toBe(before);
    editor.commands.redo();
    expect(editor.getHTML()).toBe(after);
  });
});

describe('비동기 대상 추적', () => {
  it('앞쪽 본문 입력 뒤에도 기존 커서의 삽입 위치를 추적한다', () => {
    const editor = make();
    const target = captureMediaTarget(editor, 'insert', 7);
    editor.commands.insertContentAt(1, 'NEW');
    expect(target.resolve()).toBe(10);
    target.dispose();
  });
  it('추가 대상 삭제 시 뒤쪽 다른 캐러셀에 결과를 적용하지 않는다', () => {
    const editor = make(`${carousel}<p>middle</p>${carousel}`);
    const target = captureMediaTarget(editor, 'carousel', 0);
    editor.commands.deleteRange({ from: 0, to: 1 });
    expect(target.resolve()).toBeNull();
    target.dispose();
  });
  it('하나의 트랜잭션으로 이동한 동일 캐러셀을 추적한다', () => {
    const editor = make(`${carousel}<p>middle</p>`);
    const target = captureMediaTarget(editor, 'carousel', 0);
    const node = editor.state.doc.firstChild!;
    const tr = editor.state.tr.delete(0, node.nodeSize);
    const nextPos = tr.doc.content.size;
    editor.view.dispatch(tr.insert(nextPos, node));
    expect(target.resolve()).toBe(nextPos);
    target.dispose();
  });
  it('문서 전체 교체 및 편집기 종료는 대기 결과를 무효화한다', () => {
    const editor = make();
    const target = captureMediaTarget(editor, 'insert', 3);
    editor.commands.setContent('<p>replacement</p>');
    expect(target.resolve()).toBeNull();
    const next = captureMediaTarget(editor, 'insert', 2);
    editor.destroy();
    expect(next.resolve()).toBeNull();
    target.dispose();
    next.dispose();
  });
});
