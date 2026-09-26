import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { NodeSelection, type Transaction } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';

type UploadedImage = { url: string; width: number; height: number };

/** 비동기 업로드 동안 삽입 지점 또는 캐러셀 대상을 추적한다. @param editor 편집기 @param kind 대상 종류 @param initialPos 대상 위치 */
export function captureMediaTarget(
  editor: Editor,
  kind: 'insert' | 'carousel',
  initialPos?: number,
) {
  const selection = editor.state.selection;
  let pos = initialPos ?? (selection instanceof NodeSelection ? selection.to : selection.from);
  let valid = !editor.isDestroyed;
  let target = kind === 'carousel' ? editor.state.doc.nodeAt(pos) : null;
  if (kind === 'carousel' && target?.type.name !== 'imageCarousel') valid = false;

  const onTransaction = ({ transaction: tr }: { transaction: Transaction }) => {
    if (!valid || !tr.docChanged) return;
    const replacesDocument = tr.steps.some((step, index) => {
      const json = step.toJSON();
      return (
        json.stepType === 'replace' && json.from === 0 && json.to === tr.docs[index].content.size
      );
    });
    if (replacesDocument) {
      valid = false;
      return;
    }

    const mapped = tr.mapping.mapResult(pos, 1);
    if (kind === 'carousel') {
      if (mapped.deleted) {
        const matches: number[] = [];
        tr.doc.descendants((node, at) => {
          if (node === target) matches.push(at);
        });
        if (matches.length !== 1) {
          valid = false;
          return;
        }
        pos = matches[0];
      } else {
        pos = mapped.pos;
      }
      target = tr.doc.nodeAt(pos);
      valid = target?.type.name === 'imageCarousel';
    } else {
      pos = mapped.pos;
      valid = !mapped.deleted;
    }
  };
  editor.on('transaction', onTransaction);
  return {
    resolve: () => (valid && !editor.isDestroyed ? pos : null),
    dispose: () => {
      valid = false;
      editor.off('transaction', onTransaction);
    },
  };
}

/** 텍스트를 보존하며 독립 이미지 또는 캐러셀을 한 번에 삽입한다. @param editor 편집기 @param pos 추적된 위치 @param results 업로드 결과 @param kind 삽입 종류 */
export function insertMedia(
  editor: Editor,
  pos: number,
  results: UploadedImage[],
  kind: 'images' | 'carousel',
): boolean {
  if (editor.isDestroyed || !results.length || (kind === 'carousel' && results.length < 2))
    return false;
  const { schema } = editor;
  const nodes: ProseMirrorNode[] =
    kind === 'carousel'
      ? [
          schema.nodes.imageCarousel.create({
            images: results.map(({ url, width, height }) => ({
              src: url,
              width: '90%',
              height: 'auto',
              naturalWidth: width,
              naturalHeight: height,
            })),
          }),
        ]
      : results.map(({ url, width, height }) =>
          schema.nodes.paragraph.create(
            null,
            schema.nodes.image.create({ src: url, width, height }),
          ),
        );
  const tr = closeHistory(editor.state.tr);
  // Replace fitting splits textblocks and lifts to a valid block boundary without deleting text.
  tr.insert(pos, nodes);
  if (!tr.docChanged) return false;
  tr.setMeta('mediaCommit', true);
  editor.view.dispatch(tr);
  editor.view.dispatch(closeHistory(editor.state.tr));
  return true;
}
