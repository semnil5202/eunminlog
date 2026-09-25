import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { CustomImageCarousel } from '@/features/post-editor/configs/image-carousel';
import { CustomResizableImage } from '@/features/post-editor/configs/image';
import { getCarouselResize } from '@/features/post-editor/lib/carousel-node-view';

const editors: Editor[] = [];
const items = [
  { src: '/one.webp', width: '72%', height: 'auto', naturalWidth: 688, naturalHeight: 459 },
  {
    src: '/two.webp',
    width: '90%',
    height: 'ratio:1.5000',
    naturalWidth: 1200,
    naturalHeight: 800,
  },
  { src: '/three.webp', width: '55%', height: '240px' },
];
const legacy = `<div data-type="image-carousel" style="width: 85%;">${items.map((item) => `<img src="${item.src}" data-width="${item.width}" data-height="${item.height}"${item.naturalWidth ? ` width="${item.naturalWidth}" height="${item.naturalHeight}"` : ''}>`).join('')}</div>`;

function makeEditor(content = legacy) {
  const editor = new Editor({
    extensions: [
      StarterKit.configure({ trailingNode: false }),
      CustomResizableImage,
      CustomImageCarousel,
    ],
    content,
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
});

describe('기존 저장 HTML 호환', () => {
  it('auto, ratio, px 크롭과 사용자 너비 및 자연치수를 재저장 후 복원한다', () => {
    const editor = makeEditor();
    const restored = makeEditor(editor.getHTML());
    expect(restored.state.doc.firstChild?.attrs.images).toEqual(items);
    expect(restored.state.doc.firstChild?.attrs.style).toBe('width: 85%;');
  });

  it('기존 한 장 캐러셀도 캐러셀 노드로 읽는다', () => {
    const editor = makeEditor('<div data-type="image-carousel"><img src="/old.webp"></div>');
    expect(editor.state.doc.firstChild?.type.name).toBe('imageCarousel');
    expect(editor.state.doc.firstChild?.attrs.images).toEqual([
      { src: '/old.webp', width: '90%', height: 'auto' },
    ]);
  });
});

describe('캐러셀 삭제', () => {
  it('한 장이 남아도 크기와 자연치수를 보존한 캐러셀을 유지한다', () => {
    const editor = makeEditor();
    editor.commands.removeImageFromCarousel(0, 2);
    editor.commands.removeImageFromCarousel(0, 1);
    expect(editor.state.doc.firstChild?.type.name).toBe('imageCarousel');
    expect(editor.state.doc.firstChild?.attrs.images).toEqual([items[0]]);
  });

  it('마지막 이미지 삭제는 빈 캐러셀 블록을 남기지 않는다', () => {
    const editor = makeEditor('<div data-type="image-carousel"><img src="/old.webp"></div>');
    editor.commands.removeImageFromCarousel(0, 0);
    expect(editor.getHTML()).not.toContain('image-carousel');
  });

  it('없는 위치나 이미지 인덱스는 문서를 변경하지 않는다', () => {
    const editor = makeEditor();
    const before = editor.getHTML();
    expect(editor.commands.removeImageFromCarousel(0, -1)).toBe(false);
    expect(editor.commands.removeImageFromCarousel(0, 10)).toBe(false);
    expect(editor.getHTML()).toBe(before);
  });
});

describe('크롭 리사이즈 경계', () => {
  it('100%를 초과하는 드래그는 실제 표시 너비로 저장 비율을 계산한다', () => {
    expect(getCarouselResize(1200, 300, 600)).toEqual({
      width: '100.0%',
      height: 'ratio:2.0000',
      pixels: 300,
    });
  });
  it('최소 너비·높이와 작은 컨테이너에서도 비율이 일치한다', () => {
    expect(getCarouselResize(1, 1, 40)).toEqual({
      width: '100.0%',
      height: 'ratio:0.6667',
      pixels: 60,
    });
  });
  it('반올림된 백분율로 표시되는 너비를 비율에 반영한다', () => {
    const value = getCarouselResize(233, 100, 688);
    expect(value.height).toBe(
      `ratio:${(((parseFloat(value.width) / 100) * 688) / 100).toFixed(4)}`,
    );
  });
});

describe('캐러셀 일괄 추가', () => {
  it('기존 크롭·치수를 보존하고 추가 순서 및 단일 Undo/Redo를 보장한다', () => {
    const editor = makeEditor();
    const before = editor.getHTML();
    editor.commands.addImagesToCarousel(0, [items[2], items[0]]);
    expect(editor.state.doc.firstChild?.attrs.images).toEqual([...items, items[2], items[0]]);
    editor.commands.undo();
    expect(editor.getHTML()).toBe(before);
    editor.commands.redo();
    expect(editor.state.doc.firstChild?.attrs.images).toHaveLength(5);
  });
  it('새 생성은 한 장을 거부하고 기존 캐러셀은 한 장 추가를 허용한다', () => {
    const editor = makeEditor();
    expect(editor.commands.setImageCarousel({ images: [items[0]] })).toBe(false);
    expect(editor.commands.addImagesToCarousel(0, [items[0]])).toBe(true);
    expect(editor.state.doc.firstChild?.attrs.images).toHaveLength(4);
  });
});
