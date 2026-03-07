'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE, MEDIA_CDN_URL } from '../constants/media';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

export async function getPresignedUrl(
  fileType: string,
  fileSize: number,
  key?: string,
  contentType?: string,
) {
  if (!ALLOWED_IMAGE_TYPES.includes(fileType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new Error('허용되지 않는 이미지 형식입니다. (jpeg, png, webp만 허용)');
  }

  if (fileSize > MAX_FILE_SIZE) {
    throw new Error('파일 크기가 20MB를 초과합니다.');
  }

  const uploadContentType = contentType || 'image/webp';
  const ext = uploadContentType === 'image/jpeg' ? 'jpg' : 'webp';

  if (!key) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    key = `posts/${year}/${month}/${crypto.randomUUID()}.${ext}`;
  }

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    ContentType: uploadContentType,
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  const cdnUrl = `${MEDIA_CDN_URL}/${key}`;

  return { presignedUrl, cdnUrl, key };
}
