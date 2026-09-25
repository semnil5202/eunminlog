import { toWebP } from '@/features/post-editor/lib/image';

import { getPresignedUrl } from '../api/actions';

export type UploadImageResult = { url: string; width: number; height: number };
export { IMAGE_FILE_ACCEPT, validateImageFile } from './validate-image';

async function uploadBlob(presignedUrl: string, blob: Blob) {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': blob.type || 'image/webp' },
  });
  if (!response.ok) throw new Error('S3 업로드에 실패했습니다.');
}

/** 이미지와 파생 이미지를 업로드한다. @param file 원본 파일 @param options OG 생성 옵션 */
export async function uploadImageFile(
  file: File,
  options?: { og?: boolean },
): Promise<UploadImageResult> {
  const original = await toWebP(file, { maxWidth: 2048 });
  const blobType = original.blob.type || 'image/webp';
  const { presignedUrl, cdnUrl, key } = await getPresignedUrl(
    blobType,
    original.blob.size,
    undefined,
    blobType,
  );
  await uploadBlob(presignedUrl, original.blob);

  const resized = await toWebP(file, { maxWidth: 688, quality: options?.og ? 0.75 : 0.85 });
  const ext = blobType === 'image/jpeg' ? 'jpg' : 'webp';
  const resizedKey = key.replace(/\.(webp|jpg)$/, `_688.${ext}`);
  const { presignedUrl: resizedUrl } = await getPresignedUrl(
    blobType,
    resized.blob.size,
    resizedKey,
    blobType,
  );
  await uploadBlob(resizedUrl, resized.blob);

  if (options?.og) {
    const og = await toWebP(file, { maxWidth: 1200, maxHeight: 630 });
    const ogKey = key.replace(/\.(webp|jpg)$/, `_og.${ext}`);
    const { presignedUrl: ogUrl } = await getPresignedUrl(blobType, og.blob.size, ogKey, blobType);
    await uploadBlob(ogUrl, og.blob);
  }
  return { url: cdnUrl, width: resized.width, height: resized.height };
}
