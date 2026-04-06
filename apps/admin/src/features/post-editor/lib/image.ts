import { isHeic, heicTo } from 'heic-to';

async function convertHeicToJpeg(file: File): Promise<File> {
  if (!(await isHeic(file))) return file;
  const blob = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 });
  return new File([blob], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' });
}

function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const fontSize = Math.max(14, Math.min(width, height) * 0.03);
  const gap = fontSize * 12;

  ctx.save();
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.rotate((-30 * Math.PI) / 180);

  const diagonal = Math.sqrt(width * width + height * height);

  for (let y = -diagonal; y < diagonal * 2; y += gap) {
    for (let x = -diagonal; x < diagonal * 2; x += gap) {
      ctx.fillText('eunminlog', x, y);
    }
  }

  ctx.restore();
}

type ToWebPOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

export type WebPResult = { blob: Blob; width: number; height: number };

export async function toWebP(file: File, options: ToWebPOptions = {}): Promise<WebPResult> {
  const { maxWidth, maxHeight, quality = 1 } = options;
  const source = await convertHeicToJpeg(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (maxWidth && w > maxWidth) {
        h = Math.round(h * (maxWidth / w));
        w = maxWidth;
      }

      const cropY = maxHeight && h > maxHeight ? Math.round((h - maxHeight) / 2) : 0;
      const canvasH = maxHeight && h > maxHeight ? maxHeight : h;

      const resized = document.createElement('canvas');
      resized.width = w;
      resized.height = h;
      const rCtx = resized.getContext('2d');
      if (!rCtx) {
        reject(new Error('Canvas context failed'));
        return;
      }
      rCtx.drawImage(img, 0, 0, w, h);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context failed'));
        return;
      }
      ctx.drawImage(resized, 0, cropY, w, canvasH, 0, 0, w, canvasH);
      drawWatermark(ctx, w, canvasH);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, width: w, height: canvasH });
          } else {
            canvas.toBlob(
              (fallback) =>
                fallback
                  ? resolve({ blob: fallback, width: w, height: canvasH })
                  : reject(new Error('toBlob failed')),
              'image/jpeg',
              quality,
            );
          }
          URL.revokeObjectURL(img.src);
        },
        'image/webp',
        quality,
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(source);
  });
}
