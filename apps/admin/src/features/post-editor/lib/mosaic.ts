export type MosaicRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const MOSAIC_SHORT_SIDE_BLOCKS = 8;

const unit = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

/** 정규화된 모자이크 영역을 이미지 경계 안으로 제한한다. */
export function clampRect(rect: MosaicRect): MosaicRect {
  const width = unit(rect.width);
  const height = unit(rect.height);
  return {
    x: Math.min(unit(rect.x), 1 - width),
    y: Math.min(unit(rect.y), 1 - height),
    width,
    height,
  };
}

/** 원본 이미지 좌표를 중앙 정렬된 표시 영역으로 변환하는 배율과 오프셋을 구한다. */
export function getImageMapping(
  naturalWidth: number,
  naturalHeight: number,
  viewWidth: number,
  viewHeight: number,
  cover: boolean,
): { scale: number; offsetX: number; offsetY: number } {
  if (
    ![naturalWidth, naturalHeight, viewWidth, viewHeight].every(
      (size) => Number.isFinite(size) && size > 0,
    )
  ) {
    throw new Error('이미지 크기를 확인할 수 없습니다.');
  }
  const scale = (cover ? Math.max : Math.min)(viewWidth / naturalWidth, viewHeight / naturalHeight);
  return {
    scale,
    offsetX: (viewWidth - naturalWidth * scale) / 2,
    offsetY: (viewHeight - naturalHeight * scale) / 2,
  };
}

/** 각 영역을 원본에서 독립적으로 샘플링해 고정 강도 모자이크를 그린다. */
export function renderMosaic(source: HTMLImageElement, regions: MosaicRect[]): HTMLCanvasElement {
  const width = source.naturalWidth;
  const height = source.naturalHeight;
  if (!width || !height) throw new Error('이미지를 불러오지 못했습니다.');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('이미지 편집을 지원하지 않는 환경입니다.');
  context.drawImage(source, 0, 0);

  const sample = document.createElement('canvas');
  for (const region of regions) {
    const rect = clampRect(region);
    if (!rect.width || !rect.height) continue;
    const x = Math.floor(rect.x * width);
    const y = Math.floor(rect.y * height);
    const regionWidth = Math.min(width - x, Math.ceil(rect.width * width));
    const regionHeight = Math.min(height - y, Math.ceil(rect.height * height));
    const blockSize = Math.max(1, Math.min(regionWidth, regionHeight) / MOSAIC_SHORT_SIDE_BLOCKS);
    sample.width = Math.max(1, Math.round(regionWidth / blockSize));
    sample.height = Math.max(1, Math.round(regionHeight / blockSize));
    const sampleContext = sample.getContext('2d');
    if (!sampleContext) throw new Error('이미지 편집을 지원하지 않는 환경입니다.');
    sampleContext.imageSmoothingEnabled = true;
    sampleContext.imageSmoothingQuality = 'high';
    sampleContext.drawImage(
      source,
      x,
      y,
      regionWidth,
      regionHeight,
      0,
      0,
      sample.width,
      sample.height,
    );
    context.imageSmoothingEnabled = false;
    context.drawImage(sample, 0, 0, sample.width, sample.height, x, y, regionWidth, regionHeight);
  }
  sample.width = 0;
  sample.height = 0;
  return canvas;
}
