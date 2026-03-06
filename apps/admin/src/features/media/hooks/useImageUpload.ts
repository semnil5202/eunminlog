'use client';

import { useState } from 'react';

import { toWebP } from '@/features/post-editor/lib/image';

import { getPresignedUrl } from '../api/actions';

const RESIZED_SUFFIX = '_688';
const RESIZED_MAX_WIDTH = 688;

async function uploadBlob(presignedUrl: string, blob: Blob) {
  const res = await fetch(presignedUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': 'image/webp' },
  });
  if (!res.ok) throw new Error('S3 업로드에 실패했습니다.');
}

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string> => {
    const originalBlob = await toWebP(file);
    const { presignedUrl, cdnUrl, key } = await getPresignedUrl(file.type, originalBlob.size);

    await uploadBlob(presignedUrl, originalBlob);

    const resizedBlob = await toWebP(file, { maxWidth: RESIZED_MAX_WIDTH });
    const resizedKey = key.replace(/\.webp$/, `${RESIZED_SUFFIX}.webp`);
    const { presignedUrl: resizedUrl } = await getPresignedUrl(
      file.type,
      resizedBlob.size,
      resizedKey,
    );
    await uploadBlob(resizedUrl, resizedBlob);

    return cdnUrl;
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    return Promise.all(files.map(uploadImage));
  };

  const uploadWithLoading = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      return await uploadImage(file);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadImagesWithLoading = async (files: File[]): Promise<string[]> => {
    setIsUploading(true);
    try {
      return await uploadImages(files);
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadImage: uploadWithLoading, uploadImages: uploadImagesWithLoading, isUploading };
}
