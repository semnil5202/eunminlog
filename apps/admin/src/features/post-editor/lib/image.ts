function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const fontSize = Math.max(14, Math.min(width, height) * 0.03);
  const gap = fontSize * 12;

  ctx.save();
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.rotate((-30 * Math.PI) / 180);

  const diagonal = Math.sqrt(width * width + height * height);

  for (let y = -diagonal; y < diagonal * 2; y += gap) {
    for (let x = -diagonal; x < diagonal * 2; x += gap) {
      ctx.fillText('eunminlog', x, y);
    }
  }

  ctx.restore();
}

export function toWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context failed'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      drawWatermark(ctx, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/webp',
        1,
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
