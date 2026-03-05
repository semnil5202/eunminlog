'use client';

import { type ChangeEvent, useRef } from 'react';

import { ImageIcon } from './icons';
import { toWebP } from '../lib/image';

type ThumbnailUploadProps = {
  thumbnail: string | null;
  onThumbnailChange: (url: string | null) => void;
};

export function ThumbnailUpload({ thumbnail, onThumbnailChange }: ThumbnailUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const webpBlob = await toWebP(file);
    const url = URL.createObjectURL(webpBlob);
    onThumbnailChange(url);
    e.target.value = '';
  };

  const handleDelete = () => {
    if (thumbnail) {
      URL.revokeObjectURL(thumbnail);
    }
    onThumbnailChange(null);
  };

  return (
    <>
      {thumbnail ? (
        <div className="relative">
          <img
            src={thumbnail}
            alt="썸네일 미리보기"
            className="aspect-[7/3] w-full object-cover"
          />
          <button
            type="button"
            onClick={handleDelete}
            className="absolute top-2 right-2 flex size-6 cursor-pointer items-center justify-center bg-black/50 text-white"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="flex aspect-[7/3] w-full cursor-pointer flex-col items-center justify-center gap-2 border border-input text-muted-foreground shadow-xs transition-colors hover:border-muted-foreground/50 hover:text-muted-foreground/70"
        >
          <ImageIcon />
          <span className="text-sm">썸네일 이미지 추가</span>
        </button>
      )}
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
