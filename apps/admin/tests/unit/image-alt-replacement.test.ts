import { describe, expect, it } from 'vitest';
import {
  copyReplacementImageAlt,
  mergeImageAltEdits,
} from '@/features/post-editor/lib/image-alt-replacement';

describe('편집 이미지 alt 캐시', () => {
  const original = [{ src: 'original.webp', alt: '카페 전경' }];

  it('기존 원본 매핑을 남기고 편집본 설명을 복사한다', () => {
    expect(copyReplacementImageAlt(original, 'original.webp', 'edited.webp')).toEqual([
      ...original,
      { src: 'edited.webp', alt: '카페 전경' },
    ]);
    expect(original).toHaveLength(1);
  });

  it('기존 대상 매핑을 덮어쓰거나 중복 추가하지 않는다', () => {
    const entries = [...original, { src: 'edited.webp', alt: '수정한 설명' }];
    expect(copyReplacementImageAlt(entries, 'original.webp', 'edited.webp')).toBe(entries);
    expect(copyReplacementImageAlt(original, 'missing.webp', 'edited.webp')).toBe(original);
  });

  it('설명 편집창 완료 후에도 Undo용 원본과 Redo용 편집본을 보존한다', () => {
    const copied = copyReplacementImageAlt(original, 'original.webp', 'edited.webp');
    const edited = mergeImageAltEdits(copied, [{ src: 'edited.webp', alt: '새 설명' }]);
    expect(edited).toEqual([...original, { src: 'edited.webp', alt: '새 설명' }]);
    expect(mergeImageAltEdits(edited, [{ src: 'original.webp', alt: '' }])).toEqual([
      { src: 'original.webp', alt: '' },
      { src: 'edited.webp', alt: '새 설명' },
    ]);
    expect(mergeImageAltEdits(edited, [])).toEqual(edited);
  });
});
