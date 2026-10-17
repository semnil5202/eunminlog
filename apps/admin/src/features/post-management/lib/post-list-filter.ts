type PostListFilter = {
  from: string;
  to: string;
  query: string;
};

/** 제목 검색 시 기간 제한을 해제하고, 검색어가 없으면 선택한 기간을 적용한다. */
export function getEffectivePostListFilter(filter: PostListFilter) {
  const search = filter.query.trim();

  return search
    ? { search, from: undefined, to: undefined }
    : { search: undefined, from: filter.from || undefined, to: filter.to || undefined };
}
