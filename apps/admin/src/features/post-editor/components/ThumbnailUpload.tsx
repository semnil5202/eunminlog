'use client';

import { type ChangeEvent, useRef } from 'react';

import { useImageUpload } from '@/features/media/hooks/useImageUpload';

import { ImageIcon } from './icons';

type ThumbnailUploadProps = {
  thumbnail: string | null;
  onThumbnailChange: (url: string | null) => void;
};

export function ThumbnailUpload({ thumbnail, onThumbnailChange }: ThumbnailUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, isUploading } = useImageUpload();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const cdnUrl = await uploadImage(file);
      onThumbnailChange(cdnUrl);
    } catch (err) {
      console.error('썸네일 업로드 실패:', err);
    }
    e.target.value = '';
  };

  const handleDelete = () => {
    onThumbnailChange(null);
  };

  return (
    <>
      {thumbnail ? (
        <div className="relative">
          <img src={thumbnail} alt="썸네일 미리보기" className="aspect-[7/3] w-full object-cover" />
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
          disabled={isUploading}
          className="flex aspect-[7/3] w-full cursor-pointer flex-col items-center justify-center gap-2 border border-input text-muted-foreground shadow-xs transition-colors hover:border-muted-foreground/50 hover:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImageIcon />
          <span className="text-sm">{isUploading ? '업로드 중...' : '썸네일 이미지 추가'}</span>
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
