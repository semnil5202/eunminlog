/** 인접 이미지 치수에 히스테리시스를 적용해 크기를 맞춘다. */
export function snapCarouselDimension(
  value: number,
  candidates: readonly number[],
  previous: number | null,
  min: number,
  max = Infinity,
): { value: number; target: number | null } {
  const bounded = Math.max(min, Math.min(max, value));
  const available = candidates.filter(
    (candidate) => Number.isFinite(candidate) && candidate >= min && candidate <= max,
  );
  if (previous !== null && available.includes(previous) && Math.abs(value - previous) <= 14) {
    return { value: previous, target: previous };
  }
  const nearest = available.reduce<number | null>(
    (best, candidate) =>
      Math.abs(value - candidate) <= 8 &&
      (best === null || Math.abs(value - candidate) < Math.abs(value - best))
        ? candidate
        : best,
    null,
  );
  return { value: nearest ?? bounded, target: nearest };
}
