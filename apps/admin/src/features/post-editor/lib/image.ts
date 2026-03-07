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
  quality?: number;
};

export function toWebP(file: File, options: ToWebPOptions = {}): Promise<Blob> {
  const { maxWidth, quality = 1 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (maxWidth && w > maxWidth) {
        h = Math.round(h * (maxWidth / w));
        w = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context failed'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      drawWatermark(ctx, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            canvas.toBlob(
              (fallback) =>
                fallback ? resolve(fallback) : reject(new Error('toBlob failed')),
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
    img.src = URL.createObjectURL(file);
  });
}
