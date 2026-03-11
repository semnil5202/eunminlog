'use client';

import { type ChangeEvent, useRef } from 'react';

import { NodeSelection } from '@tiptap/pm/state';

import { cn } from '@/lib/utils';
import { useImageUpload } from '@/features/media/hooks/useImageUpload';

import { ImageIcon } from '../icons';

import type { EditorProps } from './types';

export function UploadImage({ editor }: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImages, isUploading } = useImageUpload();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let results: { url: string; width: number; height: number }[];
    try {
      results = await uploadImages(Array.from(files));
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      e.target.value = '';
      return;
    }

    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;

    // Case 0: carousel node itself is selected (NodeSelection) → append images
    if (selection instanceof NodeSelection && selection.node.type.name === 'imageCarousel') {
      for (const { url, width, height } of results) {
        editor.commands.addImageToCarousel($from.pos, url, width, height);
      }
      e.target.value = '';
      return;
    }

    // Case 1: multiple files selected → create carousel directly
    if (results.length > 1) {
      const images = results.map(({ url, width, height }) => ({ src: url, width: '90%', height: 'auto', naturalWidth: width, naturalHeight: height }));

      // If cursor is after an inline image, include it in the carousel
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

            const existingWidth = nodeBefore.attrs.width as number | undefined;
            const existingHeight = nodeBefore.attrs.height as number | undefined;
            const carouselNode = editor.schema.nodes.imageCarousel.create({
              images: [{ src: existingSrc, width: '90%', height: 'auto', naturalWidth: existingWidth, naturalHeight: existingHeight }, ...images],
            });

            if (parentNode.content.size === 0) {
              tr.replaceWith(parentStart - 1, parentEnd + 1, carouselNode);
            } else {
              tr.insert(parentEnd + 1, carouselNode);
            }

            return true;
          })
          .run();
      } else {
        editor.commands.setImageCarousel({ images });
      }

      e.target.value = '';
      return;
    }

    // Case 3: single file, cursor right after an inline image → merge into carousel
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

          const existingWidth = nodeBefore.attrs.width as number | undefined;
          const existingHeight = nodeBefore.attrs.height as number | undefined;
          const carouselNode = editor.schema.nodes.imageCarousel.create({
            images: [
              { src: existingSrc, width: '90%', height: 'auto', naturalWidth: existingWidth, naturalHeight: existingHeight },
              { src: results[0].url, width: '90%', height: 'auto', naturalWidth: results[0].width, naturalHeight: results[0].height },
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

    // Case 4: single file, no special context → insert as single image with dimensions
    const { url, width, height } = results[0];
    editor.chain().focus().setImage({ src: url, width, height }).run();
    e.target.value = '';
  };

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        onClick={handleClick}
        disabled={isUploading}
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent',
          isUploading && 'cursor-not-allowed opacity-50',
        )}
      >
        <ImageIcon />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}
