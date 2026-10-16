import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProductReviewSchema } from './product-review.ts';
import { getSingleProductName, isValidRating } from '@eunminlog/config/rating';

const post = {
  place_name: null,
  product_name: ['블레이드 초코크림커피'],
  translated_product_name: null,
  rating: 3.8,
  thumbnail: 'https://media.example.com/product.webp',
  created_at: '2026-10-16T00:00:00Z',
  description: '직접 마시고 평가한 제품 리뷰',
  locale: 'ko',
};
const canonical = 'https://eunminlog.site/reviews/food/test/';

test('입력된 단일 제품 평점으로 개인 리뷰만 생성한다', () => {
  const schema = buildProductReviewSchema(post, canonical);
  assert.equal(schema['@type'], 'Product');
  assert.equal(schema.name, post.product_name[0]);
  assert.equal(schema.review.reviewRating.ratingValue, 3.8);
  assert.equal(schema.review.reviewRating.bestRating, 5);
  assert.equal(schema.review.reviewRating.worstRating, 1);
  assert.equal(schema.url, canonical);
  for (const key of ['aggregateRating', 'offers', 'brand']) assert.equal(key in schema, false);
});

test('미입력·삭제·잘못된 평점·제품 없는 글·복수 제품·방문 후기에는 생성하지 않는다', () => {
  for (const rating of [null, undefined, 0, 0.9, 5.1, 3.85, NaN, Infinity, '3.8']) {
    assert.equal(buildProductReviewSchema({ ...post, rating }, canonical), null);
  }
  for (const product_name of [null, [], [' '], ['커피', '음료']]) {
    assert.equal(buildProductReviewSchema({ ...post, product_name }, canonical), null);
  }
  assert.equal(buildProductReviewSchema({ ...post, place_name: '방문한 매장' }, canonical), null);
});

test('번역 제품명·요약·언어 URL을 사용하고 평점은 공유한다', () => {
  const schema = buildProductReviewSchema(
    { ...post, translated_product_name: ['Coffee'], description: 'A coffee review', locale: 'en' },
    'https://eunminlog.site/en/reviews/food/test/',
  );
  assert.equal(schema.name, 'Coffee');
  assert.equal(schema.review.reviewBody, 'A coffee review');
  assert.equal(schema.review.inLanguage, 'en');
  assert.equal(schema.review.reviewRating.ratingValue, 3.8);
  assert.equal(schema['@id'], 'https://eunminlog.site/en/reviews/food/test/#product');
  for (const translated_product_name of [null, [], [' '], ['Coffee', 'Tea']]) {
    assert.equal(
      buildProductReviewSchema({ ...post, translated_product_name }, canonical).name,
      post.product_name[0],
    );
  }
});

test('평점 범위와 제품 수를 공통 규칙으로 판정한다', () => {
  for (const value of [1, 1.1, 3.8, 5]) assert.equal(isValidRating(value), true);
  assert.equal(getSingleProductName([' ', ' 제품 ']), '제품');
  assert.equal(getSingleProductName(['제품', '다른 제품']), null);
});
