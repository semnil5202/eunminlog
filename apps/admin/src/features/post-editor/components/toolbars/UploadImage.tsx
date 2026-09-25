'use client';

import { useEffect, useRef } from 'react';
import { IMAGE_FILE_ACCEPT } from '@/features/media/lib/validate-image';
import { ImageIcon } from '../icons';

type Props = {
  disabled: boolean;
  onBegin: () => void;
  onFiles: (files: File[]) => void;
  onCancel: () => void;
};

/** 파일 선택을 통해 독립 이미지를 삽입하는 툴바 버튼. */
export function UploadImage({ disabled, onBegin, onFiles, onCancel }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const input = fileInput.current;
    input?.addEventListener('cancel', onCancel);
    return () => input?.removeEventListener('cancel', onCancel);
  }, [onCancel]);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        title="이미지 추가"
        aria-label="이미지 추가"
        onClick={() => {
          onBegin();
          fileInput.current?.click();
        }}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ImageIcon />
      </button>
      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        multiple
        className="hidden"
        aria-label="본문 이미지 파일"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
          if (files.length) onFiles(files);
          else onCancel();
        }}
      />
    </>
  );
}
