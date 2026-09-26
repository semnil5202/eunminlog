import { describe, expect, it } from 'vitest';
import { snapCarouselDimension } from '@/features/post-editor/lib/carousel-resize-snap';

describe('캐러셀 인접 치수 스냅', () => {
  it('8px 이내 가장 가까운 후보에 진입한다', () => {
    expect(snapCarouselDimension(192, [200, 190], null, 80, 400)).toEqual({
      value: 190,
      target: 190,
    });
    expect(snapCarouselDimension(192, [200], null, 80, 400).target).toBe(200);
    expect(snapCarouselDimension(191, [200], null, 80, 400).target).toBeNull();
  });

  it('기존 후보는 14px까지 유지하며 더 가까운 다른 후보로 흔들리지 않는다', () => {
    expect(snapCarouselDimension(214, [200, 215], 200, 80, 400)).toEqual({
      value: 200,
      target: 200,
    });
    expect(snapCarouselDimension(215, [200], 200, 80, 400)).toEqual({ value: 215, target: null });
  });

  it('최소/최대 범위 밖 후보를 무시하고 치수 제한을 유지한다', () => {
    expect(snapCarouselDimension(79, [75], null, 80, 400)).toEqual({ value: 80, target: null });
    expect(snapCarouselDimension(401, [405], null, 80, 400)).toEqual({ value: 400, target: null });
    expect(snapCarouselDimension(300, [], null, 80, 400)).toEqual({ value: 300, target: null });
  });
});
