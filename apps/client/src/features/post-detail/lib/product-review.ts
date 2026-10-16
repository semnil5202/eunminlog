import { getSingleProductName, isValidRating } from '@eunminlog/config/rating';
import { SITE_NAME_KO } from '@eunminlog/config/site';
import type { LocalizedPost } from '../../../shared/types/post';

/** 단일 제품에 입력된 평점으로 리뷰 스키마를 생성한다.
 * @param post 현재 언어의 게시글
 * @param canonical 절대 canonical URL
 */
export function buildProductReviewSchema(post: LocalizedPost, canonical: string) {
  const originalName = getSingleProductName(post.product_name);
  if (post.place_name?.trim() || !originalName || !isValidRating(post.rating)) return null;
  const name =
    post.translated_product_name?.length === 1
      ? (getSingleProductName(post.translated_product_name) ?? originalName)
      : originalName;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonical}#product`,
    name,
    image: post.thumbnail,
    url: canonical,
    review: {
      '@type': 'Review',
      '@id': `${canonical}#review`,
      author: { '@type': 'Person', name: SITE_NAME_KO },
      datePublished: post.created_at,
      reviewBody: post.description,
      inLanguage: post.locale,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: post.rating,
        bestRating: 5,
        worstRating: 1,
      },
    },
  };
}
