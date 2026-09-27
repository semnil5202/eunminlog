import { Extension } from '@tiptap/core';
import { DOMSerializer, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  ARTICLE_AD_RESERVATION,
  ARTICLE_AD_SLOTS,
  getEligibleSecondLevelHeadingIndexes,
} from '@eunminlog/config/article-ads';

const previewKey = new PluginKey<DecorationSet>('articleAdPreview');

function createPreview() {
  const element = document.createElement('div');
  element.className = 'article-ad-preview';
  element.contentEditable = 'false';
  element.setAttribute('aria-hidden', 'true');
  element.textContent = 'in article adsense';
  Object.assign(element.style, {
    minHeight: `${ARTICLE_AD_RESERVATION.minHeight}px`,
    marginBlock: `${ARTICLE_AD_RESERVATION.marginBlock}px`,
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed var(--border, #d1d5db)',
    background: 'var(--muted, #f3f4f6)',
    color: 'var(--muted-foreground, #6b7280)',
    font: '14px/1.5 sans-serif',
    userSelect: 'none',
    cursor: 'default',
  });
  for (const eventName of ['pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick']) {
    element.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  }
  return element;
}

/** 공개 본문과 동일한 적격 H2 위치에 저장되지 않는 광고 예약 표시를 만든다. */
export function createArticleAdDecorations(doc: ProseMirrorNode): DecorationSet {
  const container = document.createElement('div');
  container.append(DOMSerializer.fromSchema(doc.type.schema).serializeFragment(doc.content));
  const html = container.innerHTML;
  const headings: number[] = [];
  doc.descendants((node, position) => {
    if (node.type.name === 'heading' && node.attrs.level === 2) headings.push(position);
  });
  const headingOffset = /^<h2(?:\s|>)/i.test(html) ? 0 : 1;
  const decorations = getEligibleSecondLevelHeadingIndexes(html, ARTICLE_AD_SLOTS.length).flatMap(
    (sectionIndex, slotIndex) => {
      const position = headings[sectionIndex - headingOffset];
      if (!ARTICLE_AD_SLOTS[slotIndex]?.enabled || position === undefined) return [];
      return [
        Decoration.widget(position, createPreview, {
          side: -1,
          key: `article-preview-${slotIndex}`,
          stopEvent: () => true,
          ignoreSelection: true,
        }),
      ];
    },
  );
  return DecorationSet.create(doc, decorations);
}

export const ArticleAdPreview = Extension.create({
  name: 'articleAdPreview',
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: previewKey,
        state: {
          init: (_, state) => createArticleAdDecorations(state.doc),
          apply: (transaction, previous) =>
            transaction.docChanged ? createArticleAdDecorations(transaction.doc) : previous,
        },
        props: { decorations: (state) => previewKey.getState(state) },
      }),
    ];
  },
});
