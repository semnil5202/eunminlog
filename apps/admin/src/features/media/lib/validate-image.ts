import { MAX_FILE_SIZE } from '../constants/media';

export const IMAGE_FILE_ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif';

/** 업로드 전에 원본 파일의 지원 형식과 크기를 검증한다. @param file 원본 파일 */
export function validateImageFile(file: File): string | null {
  if (file.size === 0) return '빈 파일은 업로드할 수 없습니다.';
  if (file.size > MAX_FILE_SIZE) return '파일 크기가 50MB를 초과합니다.';
  const supported = /^image\/(jpeg|jpg|png|gif|webp|heic|heif)$/i.test(file.type);
  if (!supported && !(file.type === '' && /\.(heic|heif)$/i.test(file.name))) {
    return '지원하지 않는 이미지 형식입니다.';
  }
  return null;
}
