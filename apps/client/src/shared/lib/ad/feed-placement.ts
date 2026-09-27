/** 전체 게시글 인덱스에서 5개 간격 광고의 교대 슬롯 번호를 반환한다. */
export const getFeedAdvertisementIndex = (postIndex: number): 0 | 1 | null => {
  if (!Number.isInteger(postIndex) || postIndex < 1 || (postIndex - 1) % 5 !== 0) {
    return null;
  }
  return Math.floor((postIndex - 1) / 5) % 2 === 0 ? 0 : 1;
};
