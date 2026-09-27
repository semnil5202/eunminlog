import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { getEligibleSecondLevelHeadingIndexes } from '@eunminlog/config/article-ads';
import { ArticleAdPreview } from '@/features/post-editor/configs/article-ad-preview';
import { tiptapExtensions } from '@/features/post-editor/configs/tiptap-extensions';

describe('광고 예약 미리보기', () => {
  it('실제 편집기 extension 구성에서도 예약 표시가 생성된다', () => {
    const editor = new Editor({
      extensions: tiptapExtensions,
      content: `<p>${'가'.repeat(250)}</p><h2>제목</h2>`,
    });
    expect(editor.view.dom.querySelectorAll('.article-ad-preview')).toHaveLength(1);
    editor.destroy();
  });
  it.each([
    ['<p>짧은 글</p><h2>제목</h2>', 0],
    [`<p>${'가'.repeat(249)}</p><h2>제목</h2>`, 0],
    [`<p>${'가'.repeat(250)}</p><h2>제목</h2>`, 1],
    ['<h2>첫 제목</h2><img src="/a.webp"><h2>두 번째</h2><h2>세 번째</h2>', 1],
    ['<p>&nbsp;</p><h2>제목</h2>', 0],
    [Array.from({ length: 12 }, (_, i) => `<img src="/${i}.webp"><h2>${i}</h2>`).join(''), 10],
  ])('공개 HTML 조건과 같은 수를 표시하고 저장에서 제외한다', (content, count) => {
    const editor = new Editor({ extensions: [StarterKit, Image, ArticleAdPreview], content });
    expect(getEligibleSecondLevelHeadingIndexes(editor.getHTML(), 10)).toHaveLength(count);
    expect(editor.view.dom.querySelectorAll('.article-ad-preview')).toHaveLength(count);
    expect(editor.getHTML()).not.toContain('article-ad-preview');
    expect(JSON.stringify(editor.getJSON())).not.toContain('in article adsense');
    editor.destroy();
  });

  it('본문 변경과 Undo/Redo를 따라 갱신한다', () => {
    const editor = new Editor({
      extensions: [StarterKit, Image, ArticleAdPreview],
      content: '<p>짧은 글</p><h2>제목</h2>',
    });
    editor.commands.insertContentAt(1, '가'.repeat(250));
    expect(editor.view.dom.querySelectorAll('.article-ad-preview')).toHaveLength(1);
    editor.commands.undo();
    expect(editor.view.dom.querySelectorAll('.article-ad-preview')).toHaveLength(0);
    editor.commands.redo();
    expect(editor.view.dom.querySelectorAll('.article-ad-preview')).toHaveLength(1);
    editor.destroy();
  });
});
