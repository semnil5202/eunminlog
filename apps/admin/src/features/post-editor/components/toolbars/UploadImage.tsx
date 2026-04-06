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

    const savedState = editor.state;
    const savedSel = savedState.selection;
    const saved$from = savedSel.$from;

    let results: { url: string; width: number; height: number }[];
    try {
      results = await uploadImages(Array.from(files));
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      e.target.value = '';
      return;
    }

    // Case 0: carousel node itself was selected (NodeSelection) → append images
    if (savedSel instanceof NodeSelection && savedSel.node.type.name === 'imageCarousel') {
      const mappedPos = editor.state.tr.mapping.map(saved$from.pos);
      for (const { url, width, height } of results) {
        editor.commands.addImageToCarousel(mappedPos, url, width, height);
      }
      e.target.value = '';
      return;
    }

    // Case 1: multiple files selected → create carousel directly
    if (results.length > 1) {
      const images = results.map(({ url, width, height }) => ({
        src: url,
        width: '90%',
        height: 'auto',
        naturalWidth: width,
        naturalHeight: height,
      }));

      const nodeBefore = saved$from.nodeBefore;
      if (nodeBefore?.type.name === 'image') {
        const mappedEnd = editor.state.tr.mapping.map(saved$from.pos);
        const mapped$from = editor.state.doc.resolve(mappedEnd);
        const curNodeBefore = mapped$from.nodeBefore;

        if (curNodeBefore?.type.name === 'image') {
          const imageEndPos = mappedEnd;
          const imageStartPos = imageEndPos - curNodeBefore.nodeSize;

          const existingWidth = curNodeBefore.attrs.width as number | undefined;
          const existingHeight = curNodeBefore.attrs.height as number | undefined;
          const carouselNode = editor.schema.nodes.imageCarousel.create({
            images: [
              {
                src: curNodeBefore.attrs.src as string,
                width: '90%',
                height: 'auto',
                naturalWidth: existingWidth,
                naturalHeight: existingHeight,
              },
              ...images,
            ],
          });

          const { tr } = editor.state;
          tr.delete(imageStartPos, imageEndPos);
          const $afterDelete = tr.doc.resolve(imageStartPos);
          const parentNode = $afterDelete.parent;
          const parentStart = $afterDelete.start($afterDelete.depth);
          const parentEnd = $afterDelete.end($afterDelete.depth);

          if (parentNode.content.size === 0) {
            tr.replaceWith(parentStart - 1, parentEnd + 1, carouselNode);
          } else {
            tr.insert(parentEnd + 1, carouselNode);
          }
          editor.view.dispatch(tr);
        } else {
          const { tr } = editor.state;
          const insertPos = mappedEnd;
          const $pos = tr.doc.resolve(insertPos);
          const parentEnd = $pos.end($pos.depth);
          const carouselNode = editor.schema.nodes.imageCarousel.create({ images });
          tr.insert(parentEnd + 1, carouselNode);
          editor.view.dispatch(tr);
        }
      } else {
        const mappedPos = editor.state.tr.mapping.map(saved$from.pos);
        const { tr } = editor.state;
        const $pos = tr.doc.resolve(mappedPos);
        const parentEnd = $pos.end($pos.depth);
        const carouselNode = editor.schema.nodes.imageCarousel.create({ images });
        tr.insert(parentEnd + 1, carouselNode);
        editor.view.dispatch(tr);
      }

      e.target.value = '';
      return;
    }

    // Case 3: single file, cursor was right after an inline image → merge into carousel
    const nodeBefore = saved$from.nodeBefore;
    if (nodeBefore?.type.name === 'image') {
      const mappedEnd = editor.state.tr.mapping.map(saved$from.pos);
      const mapped$from = editor.state.doc.resolve(mappedEnd);
      const curNodeBefore = mapped$from.nodeBefore;

      if (curNodeBefore?.type.name === 'image') {
        const imageEndPos = mappedEnd;
        const imageStartPos = imageEndPos - curNodeBefore.nodeSize;

        const existingWidth = curNodeBefore.attrs.width as number | undefined;
        const existingHeight = curNodeBefore.attrs.height as number | undefined;
        const carouselNode = editor.schema.nodes.imageCarousel.create({
          images: [
            {
              src: curNodeBefore.attrs.src as string,
              width: '90%',
              height: 'auto',
              naturalWidth: existingWidth,
              naturalHeight: existingHeight,
            },
            {
              src: results[0].url,
              width: '90%',
              height: 'auto',
              naturalWidth: results[0].width,
              naturalHeight: results[0].height,
            },
          ],
        });

        const { tr } = editor.state;
        tr.delete(imageStartPos, imageEndPos);
        const $afterDelete = tr.doc.resolve(imageStartPos);
        const parentNode = $afterDelete.parent;
        const parentStart = $afterDelete.start($afterDelete.depth);
        const parentEnd = $afterDelete.end($afterDelete.depth);

        if (parentNode.content.size === 0) {
          tr.replaceWith(parentStart - 1, parentEnd + 1, carouselNode);
        } else {
          tr.insert(parentEnd + 1, carouselNode);
        }
        editor.view.dispatch(tr);
      } else {
        const { url, width, height } = results[0];
        const imageNode = editor.schema.nodes.image.create({ src: url, width, height });
        const { tr } = editor.state;
        tr.insert(mappedEnd, imageNode);
        editor.view.dispatch(tr);
      }

      e.target.value = '';
      return;
    }

    // Case 4: single file, no special context → insert as single image at saved position
    const { url, width, height } = results[0];
    const mappedPos = editor.state.tr.mapping.map(saved$from.pos);
    const imageNode = editor.schema.nodes.image.create({ src: url, width, height });
    const { tr } = editor.state;
    const $pos = tr.doc.resolve(mappedPos);
    const parentEnd = $pos.end($pos.depth);
    tr.insert(parentEnd + 1, imageNode);
    editor.view.dispatch(tr);
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
        accept="image/jpeg,image/png,image/jpg,image/gif,image/webp,image/heic,image/heif,.heic,.heif"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}
