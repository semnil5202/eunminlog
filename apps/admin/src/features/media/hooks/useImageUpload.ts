'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { uploadImageFile } from '../lib/upload-image';

export type { UploadImageResult } from '../lib/upload-image';

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (file: File, options?: { og?: boolean }) => {
    setIsUploading(true);
    const toastId = toast.loading('이미지 업로드 중...');
    try {
      const result = await uploadImageFile(file, options);
      toast.success('이미지 업로드 완료', { id: toastId });
      return result;
    } catch (error) {
      toast.error('이미지 업로드에 실패했습니다.', { id: toastId });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadImage, isUploading };
}
