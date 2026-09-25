'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { toast } from 'sonner';

import {
  uploadImageFile,
  validateImageFile,
  type UploadImageResult,
} from '@/features/media/lib/upload-image';
import { captureMediaTarget, insertMedia } from '../lib/media-insertion';

export type MediaIntakeMode = 'images' | 'carousel' | 'append';
export type MediaIntakeItem = {
  id: string;
  file: File;
  preview: string;
  status: 'waiting' | 'uploading' | 'success' | 'error';
  error?: string;
  result?: UploadImageResult;
};
type IntakeSession = {
  mode: MediaIntakeMode;
  target: ReturnType<typeof captureMediaTarget>;
  items: MediaIntakeItem[];
  busy: boolean;
  error?: string;
  toastId?: string | number;
};

/** 본문 이미지 입력과 캐러셀 생성·추가의 업로드 세션을 관리한다. */
export function useMediaIntake(editor: Editor | null) {
  const notificationId = useId();
  const active = useRef<IntakeSession | null>(null);
  const [session, setSession] = useState<IntakeSession | null>(null);

  const refresh = (current: IntakeSession) => {
    if (active.current !== current) return;
    setSession({ ...current, items: [...current.items] });
    const options = { id: notificationId, duration: Infinity, dismissible: false };
    const cancel = (event: { preventDefault: () => void }) => {
      event.preventDefault();
      if (active.current === current) close();
    };
    if (current.busy && current.mode === 'images') {
      current.toastId = toast.loading('이미지 업로드 중...', {
        ...options,
        description: undefined,
        cancel: undefined,
        action: { label: '업로드 취소', onClick: cancel },
      });
    } else if (current.error || current.items.some((item) => item.error)) {
      toast.error('이미지 업로드에 실패했습니다.', {
        ...options,
        duration: 6000,
        dismissible: true,
        description:
          current.error ??
          current.items
            .filter((item) => item.error)
            .map((item) => `${item.file.name}: ${item.error}`)
            .join(' · '),
        action: undefined,
        cancel: undefined,
      });
      current.toastId = undefined;
      dispose();
      setSession(null);
    }
  };
  const dispose = useCallback(() => {
    const current = active.current;
    active.current = null;
    if (current?.toastId !== undefined) toast.dismiss(current.toastId);
    current?.target.dispose();
    current?.items.forEach((item) => URL.revokeObjectURL(item.preview));
    if (current) current.items = [];
  }, []);
  const close = () => {
    const current = active.current;
    if (current?.toastId !== undefined) {
      toast.message('이미지 작업을 종료했습니다.', {
        id: current.toastId,
        duration: 2000,
        dismissible: true,
        description: undefined,
        action: undefined,
        cancel: undefined,
      });
      current.toastId = undefined;
    }
    dispose();
    setSession(null);
  };
  useEffect(() => () => dispose(), [editor, dispose]);

  const open = (mode: MediaIntakeMode, pos?: number) => {
    if (!editor || editor.isDestroyed || active.current) return;
    const current: IntakeSession = {
      mode,
      target: captureMediaTarget(editor, mode === 'append' ? 'carousel' : 'insert', pos),
      items: [],
      busy: false,
    };
    active.current = current;
    refresh(current);
  };
  const addFiles = (files: File[]) => {
    const current = active.current;
    if (!current || current.busy) return;
    current.items.push(
      ...files.map((file): MediaIntakeItem => {
        const error = validateImageFile(file) ?? undefined;
        return {
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          status: error ? 'error' : 'waiting',
          error,
        };
      }),
    );
    current.error = undefined;
    refresh(current);
  };
  const remove = (id: string) => {
    const current = active.current;
    if (!current || current.busy) return;
    const item = current.items.find((entry) => entry.id === id);
    if (item) URL.revokeObjectURL(item.preview);
    current.items = current.items.filter((entry) => entry.id !== id);
    current.error = undefined;
    refresh(current);
  };

  const submit = async () => {
    const current = active.current;
    if (!current || current.busy || !editor || editor.isDestroyed) return;
    const minimum = current.mode === 'carousel' ? 2 : 1;
    if (current.items.length < minimum) return;
    if (current.target.resolve() === null) {
      current.error = '삽입 위치 또는 캐러셀이 변경되었습니다. 닫은 뒤 다시 시도해주세요.';
      refresh(current);
      return;
    }
    current.busy = true;
    current.error = undefined;
    refresh(current);
    const pending = current.items.filter((item) => !item.result);
    let next = 0;
    const worker = async () => {
      while (active.current === current && next < pending.length) {
        const item = pending[next++];
        const validation = validateImageFile(item.file);
        if (validation) {
          item.status = 'error';
          item.error = validation;
          refresh(current);
          continue;
        }
        item.status = 'uploading';
        item.error = undefined;
        refresh(current);
        try {
          const result = await uploadImageFile(item.file);
          if (active.current !== current) return;
          item.result = result;
          item.status = 'success';
        } catch (error) {
          if (active.current !== current) return;
          item.status = 'error';
          item.error = error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.';
          current.busy = false;
          pending.length = 0;
        }
        refresh(current);
      }
    };
    await Promise.all([worker(), worker()]);
    if (active.current !== current) return;
    current.busy = false;
    if (current.items.some((item) => !item.result)) {
      refresh(current);
      return;
    }
    const pos = current.target.resolve();
    if (pos === null || editor.isDestroyed) {
      current.error = '삽입 위치 또는 캐러셀이 변경되었습니다. 닫은 뒤 다시 시도해주세요.';
      refresh(current);
      return;
    }
    const results = current.items.map((item) => item.result!);
    try {
      let applied: boolean;
      if (current.mode === 'append') {
        editor.view.dispatch(closeHistory(editor.state.tr));
        applied = editor.commands.addImagesToCarousel(
          pos,
          results.map(({ url, width, height }) => ({
            src: url,
            width: '90%',
            height: 'auto',
            naturalWidth: width,
            naturalHeight: height,
          })),
        );
        editor.view.dispatch(closeHistory(editor.state.tr));
      } else {
        applied = insertMedia(editor, pos, results, current.mode);
      }
      if (!applied) throw new Error('이미지를 삽입하지 못했습니다. 위치를 다시 선택해주세요.');
      current.toastId = undefined;
      close();
      if (current.mode === 'images')
        toast.success('이미지 업로드 완료', {
          id: notificationId,
          duration: 4000,
          dismissible: true,
          description: undefined,
          action: undefined,
          cancel: undefined,
        });
      editor.commands.focus();
    } catch (error) {
      current.error = error instanceof Error ? error.message : '이미지를 삽입하지 못했습니다.';
      refresh(current);
    }
  };
  const uploadFiles = (files: File[], pos?: number) => {
    if (active.current || !editor || editor.isDestroyed || !files.length) return false;
    open('images', pos);
    addFiles(files);
    void submit();
    return true;
  };
  return { session, open, close, addFiles, remove, submit, uploadFiles };
}
