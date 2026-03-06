'use client';

import { useState } from 'react';

import { toWebP } from '@/features/post-editor/lib/image';

import { getPresignedUrl } from '../api/actions';

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string> => {
    const webpBlob = await toWebP(file);
    const { presignedUrl, cdnUrl } = await getPresignedUrl(file.type, webpBlob.size);

    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: webpBlob,
      headers: { 'Content-Type': 'image/webp' },
    });

    if (!response.ok) {
      throw new Error('S3 업로드에 실패했습니다.');
    }

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
