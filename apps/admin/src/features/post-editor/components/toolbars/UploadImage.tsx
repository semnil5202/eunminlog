'use client';

import { type ChangeEvent, useRef } from 'react';

import { cn } from '@/lib/utils';
import { ImageIcon } from '../icons';

import type { EditorProps } from './types';

function toWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context failed'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/webp',
        1,
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function UploadImage({ editor }: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const webpBlob = await toWebP(file);
    const url = URL.createObjectURL(webpBlob);
    const { state } = editor;
    const { $from } = state.selection;

    // Case 1: cursor after an imageCarousel block
    let carouselPos: number | null = null;

    if ($from.depth >= 1) {
      const posBefore = $from.before();
      if (posBefore > 0) {
        const resolved = state.doc.resolve(posBefore);
        const node = resolved.nodeBefore;
        if (node?.type.name === 'imageCarousel') {
          carouselPos = posBefore - node.nodeSize;
        }
      }
    } else if ($from.pos > 0) {
      const node = $from.nodeBefore;
      if (node?.type.name === 'imageCarousel') {
        carouselPos = $from.pos - node.nodeSize;
      }
    }

    if (carouselPos !== null) {
      editor.commands.addImageToCarousel(carouselPos, url);
      e.target.value = '';
      return;
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
            images: [
              { src: existingSrc, width: '90%', height: 'auto' },
              { src: url, width: '90%', height: 'auto' },
            ],
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
