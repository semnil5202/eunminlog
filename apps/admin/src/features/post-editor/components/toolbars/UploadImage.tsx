'use client';

import { type ChangeEvent, useRef } from 'react';

import { cn } from '@/lib/utils';
import { ImageIcon } from '../icons';

import type { EditorProps } from './types';

export function UploadImage({ editor }: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const { state } = editor;
    const { $from } = state.selection;

    // Case 1: cursor after an imageCarousel block
    const posBefore = $from.before();
    if (posBefore > 0) {
      const resolved = state.doc.resolve(posBefore);
      const nodeBeforeBlock = resolved.nodeBefore;
      if (nodeBeforeBlock?.type.name === 'imageCarousel') {
        const carouselPos = posBefore - nodeBeforeBlock.nodeSize;
        editor.commands.addImageToCarousel(carouselPos, url);
        e.target.value = '';
        return;
      }
    }

    // Case 2: cursor right after an inline image
    const nodeBefore = $from.nodeBefore;
    if (nodeBefore?.type.name === 'image') {
      const existingSrc = nodeBefore.attrs.src as string;
      const imageEndPos = $from.pos;
      const imageStartPos = imageEndPos - nodeBefore.nodeSize;

      editor
        .chain()
        .focus()
        .command(({ tr, dispatch }) => {
          if (!dispatch) return true;

          tr.delete(imageStartPos, imageEndPos);

          const $afterDelete = tr.doc.resolve(imageStartPos);
          const parentNode = $afterDelete.parent;
          const parentStart = $afterDelete.start($afterDelete.depth);
          const parentEnd = $afterDelete.end($afterDelete.depth);

          const carouselNode = editor.schema.nodes.imageCarousel.create({
            images: [{ src: existingSrc }, { src: url }],
          });

          if (parentNode.content.size === 0) {
            tr.replaceWith(parentStart - 1, parentEnd + 1, carouselNode);
          } else {
            tr.insert(parentEnd + 1, carouselNode);
          }

          return true;
        })
        .run();

      e.target.value = '';
      return;
    }

    // Case 3: default — insert as single image
    editor.chain().focus().setImage({ src: url }).run();
    e.target.value = '';
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent',
        )}
      >
        <ImageIcon />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}
