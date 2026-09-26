type ImageAltEntry = { src: string; alt: string };

/** 기존 URL의 설명을 보존하면서 교체 이미지에 복사한다. */
export function copyReplacementImageAlt(
  entries: ImageAltEntry[],
  previous: string,
  next: string,
): ImageAltEntry[] {
  const original = entries.find((entry) => entry.src === previous);
  if (!original || entries.some((entry) => entry.src === next)) return entries;
  return [...entries, { src: next, alt: original.alt }];
}

/** 현재 이미지 설명을 갱신하고 Undo에 필요한 이전 URL 설명은 유지한다. */
export function mergeImageAltEdits(
  entries: ImageAltEntry[],
  updates: ImageAltEntry[],
): ImageAltEntry[] {
  const merged = new Map(entries.map((entry) => [entry.src, entry]));
  for (const entry of updates) merged.set(entry.src, entry);
  return [...merged.values()];
}
