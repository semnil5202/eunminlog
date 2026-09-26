import { afterEach, describe, expect, it, vi } from 'vitest';
import { clampRect, getImageMapping, renderMosaic } from '@/features/post-editor/lib/mosaic';

afterEach(() => vi.restoreAllMocks());

describe('모자이크 좌표', () => {
  it('이동 시 영역 크기를 유지하면서 이미지 경계 안으로 제한한다', () => {
    expect(clampRect({ x: 0.9, y: -0.1, width: 0.3, height: 0.4 })).toEqual({
      x: 0.7,
      y: 0,
      width: 0.3,
      height: 0.4,
    });
  });

  it('초과 크기와 잘못된 값을 제한한다', () => {
    expect(clampRect({ x: NaN, y: Infinity, width: 3, height: -1 })).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 0,
    });
  });

  it('cover 크롭의 중앙 오프셋으로 원본 좌표를 역산한다', () => {
    const { scale, offsetX, offsetY } = getImageMapping(1200, 800, 300, 300, true);
    expect({ scale, offsetX, offsetY }).toEqual({ scale: 0.375, offsetX: -75, offsetY: 0 });
    expect((0 - offsetX) / scale).toBe(200);
    expect((300 - offsetX) / scale).toBe(1000);
  });

  it('contain과 세로 이미지 cover를 지원한다', () => {
    expect(getImageMapping(1200, 800, 300, 300, false)).toEqual({
      scale: 0.25,
      offsetX: 0,
      offsetY: 50,
    });
    expect(getImageMapping(800, 1200, 300, 300, true)).toEqual({
      scale: 0.375,
      offsetX: 0,
      offsetY: -75,
    });
  });

  it('크기가 없는 이미지의 잘못된 좌표 계산을 차단한다', () => {
    expect(() => getImageMapping(0, 800, 300, 300, true)).toThrow();
    expect(() => getImageMapping(800, 800, Infinity, 300, true)).toThrow();
  });
});

describe('모자이크 렌더링', () => {
  function setup() {
    const output = { drawImage: vi.fn(), imageSmoothingEnabled: true };
    const sample = {
      drawImage: vi.fn(),
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValueOnce(output as unknown as CanvasRenderingContext2D)
      .mockReturnValue(sample as unknown as CanvasRenderingContext2D);
    const image = { naturalWidth: 800, naturalHeight: 600 } as HTMLImageElement;
    return { output, sample, image };
  }

  it('원본 크기를 보존하고 짧은 변 8블록으로 확대한다', () => {
    const { output, sample, image } = setup();
    const result = renderMosaic(image, [{ x: 0.1, y: 0.2, width: 0.2, height: 0.4 }]);
    expect([result.width, result.height]).toEqual([800, 600]);
    expect(sample.drawImage).toHaveBeenCalledWith(image, 80, 120, 160, 240, 0, 0, 8, 12);
    expect(output.imageSmoothingEnabled).toBe(false);
    expect(output.drawImage).toHaveBeenLastCalledWith(
      expect.any(HTMLCanvasElement),
      0,
      0,
      8,
      12,
      80,
      120,
      160,
      240,
    );
  });

  it('큰 영역도 같은 비율의 블록 강도를 사용한다', () => {
    const { sample, image } = setup();
    renderMosaic(image, [
      { x: 0, y: 0, width: 0.1, height: 0.2 },
      { x: 0, y: 0, width: 0.2, height: 0.4 },
    ]);
    expect(sample.drawImage.mock.calls.map((args) => args.slice(-2))).toEqual([
      [8, 12],
      [8, 12],
    ]);
  });

  it('겹친 영역은 이전 결과 대신 항상 원본에서 샘플링한다', () => {
    const { sample, image } = setup();
    renderMosaic(image, [
      { x: 0.1, y: 0.1, width: 0.3, height: 0.3 },
      { x: 0.2, y: 0.2, width: 0.3, height: 0.3 },
    ]);
    expect(sample.drawImage).toHaveBeenCalledTimes(2);
    expect(sample.drawImage.mock.calls.every((args) => args[0] === image)).toBe(true);
  });

  it('빈 영역은 무시하고 작은 영역도 최소 한 픽셀로 처리한다', () => {
    const { sample, image } = setup();
    renderMosaic(image, [
      { x: 0, y: 0, width: 0, height: 0.5 },
      { x: 1, y: 1, width: 0.0001, height: 0.0001 },
    ]);
    expect(sample.drawImage).toHaveBeenCalledTimes(1);
    expect(sample.drawImage).toHaveBeenCalledWith(image, 799, 599, 1, 1, 0, 0, 1, 1);
  });

  it('미로드 이미지 또는 Canvas 지원 실패를 전달한다', () => {
    expect(() =>
      renderMosaic({ naturalWidth: 0, naturalHeight: 0 } as HTMLImageElement, []),
    ).toThrow();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(() =>
      renderMosaic({ naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement, []),
    ).toThrow();
  });
});
