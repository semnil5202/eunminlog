import type { Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import type { Transaction } from '@tiptap/pm/state';
import type { CarouselImage } from '../types/carousel';

/** 모자이크 저장 동안 원본 이미지 위치와 캐러셀 항목을 추적한다. @param editor 편집기 @param initialPos 노드 위치 @param index 캐러셀 이미지 번호 */
export function captureMosaicTarget(editor: Editor, initialPos: number, index?: number) {
  let pos = initialPos;
  let node = editor.state.doc.nodeAt(pos);
  const carousel = index !== undefined;
  let image = carousel ? (node?.attrs.images as CarouselImage[] | undefined)?.[index] : null;
  const src: string = carousel ? (image?.src ?? '') : (node?.attrs.src ?? '');
  let valid = !!src && node?.type.name === (carousel ? 'imageCarousel' : 'image');

  const findIndex = (images: CarouselImage[]) => {
    const matches = images.flatMap((item, at) => (item.src === src ? [at] : []));
    return matches.length === 1 ? matches[0] : -1;
  };
  if (carousel && findIndex(node?.attrs.images ?? []) < 0) valid = false;

  const onTransaction = ({ transaction: tr }: { transaction: Transaction }) => {
    if (!valid || !tr.docChanged) return;
    for (let i = 0; i < tr.steps.length; i++) {
      const step = tr.steps[i].toJSON();
      if (step.stepType === 'replace' && step.from === 0 && step.to === tr.docs[i].content.size) {
        valid = false;
        return;
      }
      const mapped = tr.mapping.maps[i].mapResult(pos, 1);
      if (mapped.deleted) {
        const updatedCarousel =
          carousel &&
          step.stepType === 'replace' &&
          step.from === pos &&
          step.to === pos + (node?.nodeSize ?? 0) &&
          step.slice?.content?.length === 1 &&
          step.slice.content[0].type === 'imageCarousel';
        if (!updatedCarousel) {
          valid = false;
          return;
        }
      } else {
        pos = mapped.pos;
      }
      const doc = tr.docs[i + 1] ?? tr.doc;
      node = doc.nodeAt(pos);
      if (carousel) {
        const images: CarouselImage[] =
          node?.type.name === 'imageCarousel' ? node.attrs.images : [];
        const next = findIndex(images);
        if (next < 0) {
          valid = false;
          return;
        }
        image = images[next];
      } else if (node?.type.name !== 'image' || node.attrs.src !== src) {
        valid = false;
        return;
      }
    }
  };
  editor.on('transaction', onTransaction);
  const dispose = () => {
    valid = false;
    editor.off('transaction', onTransaction);
  };
  return {
    src,
    apply(url: string) {
      if (!valid || editor.isDestroyed || !url) return false;
      const current = editor.state.doc.nodeAt(pos);
      if (!current || current.type.name !== (carousel ? 'imageCarousel' : 'image')) return false;
      let attrs: Record<string, unknown> = { ...current.attrs, src: url };
      if (carousel) {
        const images: CarouselImage[] = current.attrs.images;
        const at = findIndex(images);
        if (at < 0 || images[at] !== image) return false;
        attrs = {
          ...current.attrs,
          images: images.map((item, i) => (i === at ? { ...item, src: url } : item)),
        };
      } else if (current.attrs.src !== src) return false;
      const tr = closeHistory(editor.state.tr).setNodeMarkup(pos, null, attrs);
      dispose();
      editor.view.dispatch(tr);
      editor.view.dispatch(closeHistory(editor.state.tr));
      return true;
    },
    dispose,
  };
}
