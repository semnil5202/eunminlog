'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import type { Editor } from '@tiptap/core';
import { toast } from 'sonner';

function hasFiles(data: DataTransfer | null) {
  return !!data && (Array.from(data.types).includes('Files') || data.files.length > 0);
}

function getFiles(data: DataTransfer) {
  const files = Array.from(data.files);
  return files.length
    ? files
    : Array.from(data.items).flatMap((item) => {
        const file = item.kind === 'file' ? item.getAsFile() : null;
        return file ? [file] : [];
      });
}

/** 본문 파일 붙여넣기·외부 드롭을 기존 업로드 세션에 연결한다. */
export function useImageTransfer({
  editor,
  disabled,
  uploadFiles,
}: {
  editor: Editor | null;
  disabled: boolean;
  uploadFiles: (files: File[], pos?: number) => boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const internalDrag = useRef(false);
  useEffect(() => {
    const clear = () => {
      internalDrag.current = false;
      setDragging(false);
    };
    window.addEventListener('dragend', clear);
    window.addEventListener('drop', clear);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('dragend', clear);
      window.removeEventListener('drop', clear);
      window.removeEventListener('blur', clear);
    };
  }, []);
  const enabled = !disabled && editor && !editor.isDestroyed && editor.isEditable;
  const receive = (files: File[], pos?: number) => {
    if (!files.length) {
      toast.error('이미지 파일을 읽지 못했습니다. 파일 선택 버튼을 이용해주세요.');
    } else if (!uploadFiles(files, pos)) {
      toast.error('진행 중인 이미지 작업을 완료하거나 취소한 뒤 다시 시도해주세요.');
    }
  };
  return {
    dragging: !!enabled && dragging,
    handlers: {
      onPasteCapture(event: ClipboardEvent<HTMLDivElement>) {
        if (event.target instanceof Element && event.target.closest('.image-alt-field')) return;
        if (!enabled || !(event.target instanceof Element) || !event.target.closest('.ProseMirror'))
          return;
        const files = getFiles(event.clipboardData);
        if (!files.length) return;
        event.preventDefault();
        event.stopPropagation();
        receive(files);
      },
      onDragStartCapture() {
        internalDrag.current = true;
      },
      onDragEndCapture() {
        internalDrag.current = false;
        setDragging(false);
      },
      onDragOverCapture(event: DragEvent<HTMLDivElement>) {
        if (event.target instanceof Element && event.target.closest('.image-alt-field')) return;
        if (
          internalDrag.current ||
          (editor && !editor.isDestroyed && editor.view.dragging) ||
          !hasFiles(event.dataTransfer)
        )
          return;
        event.preventDefault();
        event.dataTransfer.dropEffect = enabled ? 'copy' : 'none';
        setDragging(!!enabled);
      },
      onDragLeaveCapture(event: DragEvent<HTMLDivElement>) {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setDragging(false);
      },
      onDropCapture(event: DragEvent<HTMLDivElement>) {
        setDragging(false);
        if (event.target instanceof Element && event.target.closest('.image-alt-field')) {
          if (hasFiles(event.dataTransfer)) event.preventDefault();
          return;
        }
        if (internalDrag.current || (editor && !editor.isDestroyed && editor.view.dragging)) {
          internalDrag.current = false;
          return;
        }
        if (!hasFiles(event.dataTransfer)) return;
        event.preventDefault();
        event.stopPropagation();
        if (!enabled) {
          toast.error('이미지는 본문 편집 모드에서 놓아주세요.');
          return;
        }
        const bounds = editor.view.dom.getBoundingClientRect();
        const pos = editor.view.posAtCoords({
          left: Math.max(bounds.left + 1, Math.min(event.clientX, bounds.right - 1)),
          top: Math.max(bounds.top + 1, Math.min(event.clientY, bounds.bottom - 1)),
        })?.pos;
        if (pos === undefined) {
          toast.error('이미지를 넣을 본문 위치에 다시 놓아주세요.');
          return;
        }
        receive(getFiles(event.dataTransfer), pos);
      },
    },
  };
}
