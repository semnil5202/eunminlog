import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { tiptapExtensions } from '@/features/post-editor/configs/tiptap-extensions';
import { captureMosaicTarget } from '@/features/post-editor/lib/mosaic-target';

const editors: Editor[] = [];
function make(
  content = '<p>before</p><p><img src="/old.webp" alt="설명" width="400" style="width: 70%; height: auto;"></p>',
) {
  const editor = new Editor({ extensions: tiptapExtensions, content });
  editors.push(editor);
  return editor;
}
function imagePos(editor: Editor) {
  let pos = 0;
  editor.state.doc.descendants((node, at) => {
    if (node.type.name === 'image') pos = at;
  });
  return pos;
}
const carousel =
  '<div data-type="image-carousel"><img src="/first.webp" data-width="72%" data-height="ratio:1.5" width="1000" height="700"><img src="/second.webp"></div><p>after</p>';
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));

describe('모자이크 저장 대상', () => {
  it('앞쪽 입력 후 위치를 추적하고 src 외 속성을 유지하며 한 번의 Undo/Redo로 교체한다', () => {
    const editor = make();
    const original = editor.state.doc.nodeAt(imagePos(editor))!.attrs;
    const target = captureMosaicTarget(editor, imagePos(editor));
    editor.commands.insertContentAt(1, 'NEW');
    const before = editor.getHTML();
    expect(target.apply('/mosaic.webp')).toBe(true);
    expect(editor.state.doc.nodeAt(imagePos(editor))!.attrs).toEqual({
      ...original,
      src: '/mosaic.webp',
    });
    const after = editor.getHTML();
    editor.commands.undo();
    expect(editor.getHTML()).toBe(before);
    editor.commands.redo();
    expect(editor.getHTML()).toBe(after);
    expect(target.apply('/again.webp')).toBe(false);
  });
  it.each(['delete', 'replace', 'document', 'dispose', 'destroy'])(
    '%s 이후 늦은 결과를 거부한다',
    (operation) => {
      const editor = make();
      const pos = imagePos(editor);
      const target = captureMosaicTarget(editor, pos);
      if (operation === 'delete') editor.commands.deleteRange({ from: pos, to: pos + 1 });
      if (operation === 'replace')
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, null, { src: '/other.webp' }));
      if (operation === 'document') editor.commands.setContent(editor.getHTML());
      if (operation === 'dispose') target.dispose();
      if (operation === 'destroy') editor.destroy();
      expect(target.apply('/late.webp')).toBe(false);
      target.dispose();
    },
  );
  it('캐러셀 순서 변경 후 고유 src로 원 이미지만 바꾸고 크롭·치수·다른 이미지를 보존한다', () => {
    const editor = make(carousel);
    const target = captureMosaicTarget(editor, 0, 0);
    const node = editor.state.doc.firstChild!;
    const images = [...node.attrs.images].reverse().map((item) => ({ ...item }));
    editor.view.dispatch(editor.state.tr.setNodeMarkup(0, null, { ...node.attrs, images }));
    expect(target.apply('/mosaic.webp')).toBe(true);
    expect(editor.state.doc.firstChild!.attrs.images).toEqual([
      images[0],
      { ...images[1], src: '/mosaic.webp' },
    ]);
  });
  it('중복 src는 잘못된 대상 교체를 피하도록 거부한다', () => {
    const editor = make(carousel.replace('/second.webp', '/first.webp'));
    const target = captureMosaicTarget(editor, 0, 0);
    expect(target.apply('/mosaic.webp')).toBe(false);
    target.dispose();
  });
  it('캐러셀 대상 삭제 후 같은 위치로 당겨진 다음 항목을 교체하지 않는다', () => {
    const editor = make(carousel);
    const target = captureMosaicTarget(editor, 0, 0);
    editor.commands.removeImageFromCarousel(0, 0);
    expect(target.apply('/mosaic.webp')).toBe(false);
    expect(editor.state.doc.firstChild!.attrs.images[0].src).toBe('/second.webp');
    target.dispose();
  });
});
