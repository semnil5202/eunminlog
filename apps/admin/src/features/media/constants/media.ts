export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const MEDIA_CDN_URL = process.env.NEXT_PUBLIC_MEDIA_CDN_URL ?? '';
