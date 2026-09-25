export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 파일당 50MB
export const MEDIA_CDN_URL = process.env.NEXT_PUBLIC_MEDIA_CDN_URL ?? '';
