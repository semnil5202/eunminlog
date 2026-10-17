import { createHash } from 'node:crypto';
import type { LocalizedPost } from '../types/post';

/** 출력 모델의 객체 키를 정렬하고 배열 순서를 보존해 해시한다.
 * @param model 페이지 출력에 사용하는 데이터
 */
export const hashPageModel = (model: unknown): string =>
  createHash('sha256')
    .update(
      JSON.stringify({ version: 1, model }, (_key, value) =>
        value && typeof value === 'object' && !Array.isArray(value)
          ? Object.fromEntries(
              Object.keys(value)
                .sort()
                .map((key) => [key, value[key]]),
            )
          : value,
      ),
    )
    .digest('hex');

/** 피드·추천·인접 카드에서 사용하는 데이터를 선택한다.
 * @param post 언어가 적용된 글
 */
export const cardCacheModel = (post: LocalizedPost) => ({
  slug: post.slug,
  title: post.title,
  description: post.description,
  category: post.category,
  subCategory: post.sub_category,
  thumbnail: post.thumbnail,
  thumbnailAlt: post.thumbnail_alt ?? post.title,
  sponsored: post.is_sponsored,
  recommended: post.is_recommended,
  createdAt: post.created_at,
  placeName: post.place_name,
  translatedPlaceName: post.translated_place_name,
});

/** 같은 분류에서 현재 글 앞 한 칸부터 최대 네 글을 선택한다.
 * @param posts 최신순 글 목록
 * @param slug 현재 글 slug
 */
export const selectNearbyPosts = <T extends { slug: string }>(posts: T[], slug: string): T[] => {
  const currentIndex = posts.findIndex((post) => post.slug === slug);
  const sliceStart = Math.max(0, currentIndex - 1);
  return posts.slice(sliceStart, sliceStart + 4);
};
