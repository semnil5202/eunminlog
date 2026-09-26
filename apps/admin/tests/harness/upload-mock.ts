export type UploadImageResult = { url: string; width: number; height: number };
export const uploadCalls: string[] = [];
const attempts = new Map<string, number>();
Object.assign(window, { uploadCalls });

export async function uploadImageFile(
  file: File,
  options?: { watermark?: boolean },
): Promise<UploadImageResult> {
  uploadCalls.push(file.name);
  const count = (attempts.get(file.name) ?? 0) + 1;
  attempts.set(file.name, count);
  const mosaic = file.name === 'mosaic.png';
  const controls = window as unknown as {
    mosaicDelay?: number;
    mosaicFail?: boolean;
    mosaicWatermark?: boolean;
  };
  if (mosaic) controls.mosaicWatermark = options?.watermark;
  await new Promise((resolve) =>
    setTimeout(
      resolve,
      mosaic
        ? (controls.mosaicDelay ?? 30)
        : file.name.includes('very-slow')
          ? 2000
          : file.name.includes('slow')
            ? 800
            : 30,
    ),
  );
  if (mosaic && controls.mosaicFail) {
    controls.mosaicFail = false;
    throw new Error('테스트 모자이크 업로드 실패');
  }
  if (mosaic) {
    const url = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    return { url, width: 688, height: 400 };
  }
  if (file.name.includes('fail') && count === 1) throw new Error('테스트 업로드 실패');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="688" height="400"><rect width="688" height="400" fill="#749b81"/><text x="30" y="80" font-size="36">${file.name}</text></svg>`;
  return { url: `data:image/svg+xml,${encodeURIComponent(svg)}`, width: 688, height: 400 };
}
export { IMAGE_FILE_ACCEPT, validateImageFile } from '@/features/media/lib/validate-image';
