import { describe, expect, it } from 'vitest';

import { getEffectivePostListFilter } from '@/features/post-management/lib/post-list-filter';

const dateRange = { from: '2026-09-17', to: '2026-10-17' };

describe('getEffectivePostListFilter', () => {
  it('제목 검색어가 있으면 선택된 기간을 조회 조건에서 제외한다', () => {
    expect(getEffectivePostListFilter({ ...dateRange, query: '  청약통장  ' })).toEqual({
      search: '청약통장',
      from: undefined,
      to: undefined,
    });
  });

  it('검색어가 비어 있으면 날짜 범위를 유지한다', () => {
    expect(getEffectivePostListFilter({ ...dateRange, query: '   ' })).toEqual({
      search: undefined,
      ...dateRange,
    });
  });
});
