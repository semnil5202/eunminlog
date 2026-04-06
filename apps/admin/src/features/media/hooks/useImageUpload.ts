'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { toWebP } from '@/features/post-editor/lib/image';

import { getPresignedUrl } from '../api/actions';

const ORIGINAL_MAX_WIDTH = 2048;
const RESIZED_SUFFIX = '_688';
const RESIZED_MAX_WIDTH = 688;
const OG_SUFFIX = '_og';
const OG_MAX_WIDTH = 1200;

export type UploadImageResult = { url: string; width: number; height: number };

async function uploadBlob(presignedUrl: string, blob: Blob) {
  const res = await fetch(presignedUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': blob.type || 'image/webp' },
  });
  if (!res.ok) throw new Error('S3 업로드에 실패했습니다.');
}

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (
    file: File,
    options?: { og?: boolean },
  ): Promise<UploadImageResult> => {
    const original = await toWebP(file, { maxWidth: ORIGINAL_MAX_WIDTH });
    const blobType = original.blob.type || 'image/webp';
    const { presignedUrl, cdnUrl, key } = await getPresignedUrl(
      blobType,
      original.blob.size,
      undefined,
      blobType,
    );

    await uploadBlob(presignedUrl, original.blob);

    const resized = await toWebP(file, { maxWidth: RESIZED_MAX_WIDTH, quality: 0.75 });
    const ext = blobType === 'image/jpeg' ? 'jpg' : 'webp';
    const resizedKey = key.replace(/\.(webp|jpg)$/, `${RESIZED_SUFFIX}.${ext}`);
    const { presignedUrl: resizedUrl } = await getPresignedUrl(
      blobType,
      resized.blob.size,
      resizedKey,
      blobType,
    );
    await uploadBlob(resizedUrl, resized.blob);

    if (options?.og) {
      const og = await toWebP(file, { maxWidth: OG_MAX_WIDTH, maxHeight: 630 });
      const ogKey = key.replace(/\.(webp|jpg)$/, `${OG_SUFFIX}.${ext}`);
      const { presignedUrl: ogPresignedUrl } = await getPresignedUrl(
        blobType,
        og.blob.size,
        ogKey,
        blobType,
      );
      await uploadBlob(ogPresignedUrl, og.blob);
    }

    return { url: cdnUrl, width: resized.width, height: resized.height };
  };

  const uploadImages = async (files: File[]): Promise<UploadImageResult[]> => {
    return Promise.all(files.map((file) => uploadImage(file)));
  };

  const uploadWithLoading = async (
    file: File,
    options?: { og?: boolean },
  ): Promise<UploadImageResult> => {
    setIsUploading(true);
    const toastId = toast.loading('이미지 업로드 중...');
    try {
      const result = await uploadImage(file, options);
      toast.success('이미지 업로드 완료', { id: toastId });
      return result;
    } catch (err) {
      toast.error('이미지 업로드에 실패했습니다.', { id: toastId });
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadImagesWithLoading = async (files: File[]): Promise<UploadImageResult[]> => {
    setIsUploading(true);
    const toastId = toast.loading(`이미지 ${files.length}장 업로드 중...`);
    try {
      const results = await uploadImages(files);
      toast.success(`이미지 ${files.length}장 업로드 완료`, { id: toastId });
      return results;
    } catch (err) {
      toast.error('이미지 업로드에 실패했습니다.', { id: toastId });
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadImage: uploadWithLoading, uploadImages: uploadImagesWithLoading, isUploading };
}
