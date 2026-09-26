import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toWebP } from '@/features/post-editor/lib/image';
import { getPresignedUrl } from '@/features/media/api/actions';
import { uploadImageFile } from '@/features/media/lib/upload-image';
import { validateImageFile } from '@/features/media/lib/validate-image';

vi.mock('@/features/post-editor/lib/image', () => ({ toWebP: vi.fn() }));
vi.mock('@/features/media/api/actions', () => ({ getPresignedUrl: vi.fn() }));
const file = new File(['image'], 'photo.png', { type: 'image/png' });

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  vi.mocked(toWebP).mockResolvedValue({
    blob: new Blob(['webp'], { type: 'image/webp' }),
    width: 688,
    height: 400,
  });
  vi.mocked(getPresignedUrl).mockImplementation(async (_type, _size, key) => ({
    key: key ?? 'posts/2026/09/test.webp',
    presignedUrl: 'https://upload.test',
    cdnUrl: 'https://media.test/posts/2026/09/test.webp',
  }));
});

describe('기존 미디어 파이프라인 보존', () => {
  it('본문 이미지의 원본·688 변형과 실제 치수를 유지한다', async () => {
    const result = await uploadImageFile(file);
    expect(toWebP).toHaveBeenNthCalledWith(1, file, { maxWidth: 2048, watermark: true });
    expect(toWebP).toHaveBeenNthCalledWith(2, file, {
      maxWidth: 688,
      quality: 0.85,
      watermark: true,
    });
    expect(getPresignedUrl).toHaveBeenNthCalledWith(
      2,
      'image/webp',
      4,
      'posts/2026/09/test_688.webp',
      'image/webp',
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      url: 'https://media.test/posts/2026/09/test.webp',
      width: 688,
      height: 400,
    });
  });
  it('썸네일의 별도 품질과 OG 변형을 유지한다', async () => {
    await uploadImageFile(file, { og: true });
    expect(toWebP).toHaveBeenNthCalledWith(2, file, {
      maxWidth: 688,
      quality: 0.75,
      watermark: true,
    });
    expect(toWebP).toHaveBeenNthCalledWith(3, file, {
      maxWidth: 1200,
      maxHeight: 630,
      watermark: true,
    });
    expect(getPresignedUrl).toHaveBeenNthCalledWith(
      3,
      'image/webp',
      4,
      'posts/2026/09/test_og.webp',
      'image/webp',
    );
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('재편집 이미지의 원본·688·OG 모두 추가 워터마크를 생략한다', async () => {
    await uploadImageFile(file, { og: true, watermark: false });
    expect(toWebP).toHaveBeenNthCalledWith(1, file, { maxWidth: 2048, watermark: false });
    expect(toWebP).toHaveBeenNthCalledWith(2, file, {
      maxWidth: 688,
      quality: 0.75,
      watermark: false,
    });
    expect(toWebP).toHaveBeenNthCalledWith(3, file, {
      maxWidth: 1200,
      maxHeight: 630,
      watermark: false,
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('S3 PUT 실패를 파일별 재시도 계층으로 전달한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    await expect(uploadImageFile(file)).rejects.toThrow('S3 업로드에 실패했습니다.');
  });
});

describe('변환 전 원본 검증', () => {
  it('지원 형식과 MIME 없는 HEIC를 허용한다', () => {
    expect(validateImageFile(file)).toBeNull();
    expect(validateImageFile(new File(['heic'], 'photo.HEIC'))).toBeNull();
  });
  it('빈 파일, 비이미지, 50MB 초과 파일을 거절한다', () => {
    expect(validateImageFile(new File([], 'empty.png', { type: 'image/png' }))).toContain(
      '빈 파일',
    );
    expect(
      validateImageFile(new File(['pdf'], 'photo.pdf', { type: 'application/pdf' })),
    ).toContain('지원하지 않는');
    const large = new File(['image'], 'large.png', { type: 'image/png' });
    Object.defineProperty(large, 'size', { value: 50 * 1024 * 1024 + 1 });
    expect(validateImageFile(large)).toContain('50MB');
  });
});
