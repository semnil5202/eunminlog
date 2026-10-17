import assert from 'node:assert/strict';
import test from 'node:test';
import { createBuildData, subCategoryKey, resolveLocalizedPost } from './build-data-index.ts';

const post = (id, overrides = {}) => ({
  id,
  slug: `slug-${id}`,
  title: `원문 ${id}`,
  description: '원문 설명',
  content: '원문 본문',
  category: 'cafe',
  sub_category: 'hotplace',
  thumbnail_alt: '원문 alt',
  image_alts: [{ src: 'image.webp', alt: '원문 이미지' }],
  updated_at: '2026-10-17T00:00:00Z',
  ...overrides,
});

const translation = (locale, overrides = {}) => ({
  post_id: 'B',
  locale,
  title: '번역 제목',
  description: '',
  content: '번역 본문',
  thumbnail_alt: '',
  image_alts: [],
  place_name: null,
  address: null,
  product_name: null,
  purchase_source: null,
  price_prefix: null,
  ...overrides,
});

const rows = () => ({
  posts: [post('B'), post('A'), post('C', { category: 'travel', sub_category: 'domestic' })],
  translations: [translation('en'), translation('ja')],
  categories: [
    { id: 'parent', slug: 'cafe', name: '카페', parent_id: null },
    { id: 'child', slug: 'hotplace', name: '핫플', parent_id: 'parent', is_multilingual: true },
  ],
  categoryTranslations: [
    { category_id: 'parent', locale: 'en', name: 'Cafe' },
    { category_id: 'child', locale: 'en', name: 'Hot Place' },
  ],
});

test('글 인덱스는 수집한 표시 순서와 객체 참조를 유지하고 활성 분류용 ID 순서를 별도 제공', () => {
  const input = rows();
  const data = createBuildData(input);
  assert.deepEqual(
    data.posts.map((p) => p.id),
    ['B', 'A', 'C'],
  );
  assert.deepEqual(
    data.postsByIdOrder.map((p) => p.id),
    ['A', 'B', 'C'],
  );
  assert.strictEqual(data.postsById.get('B'), input.posts[0]);
  assert.strictEqual(data.postsBySlug.get('slug-B'), input.posts[0]);
  assert.deepEqual(
    data.postsByCategory.get('cafe').map((p) => p.id),
    ['B', 'A'],
  );
  assert.deepEqual(
    data.postsBySubCategory.get(subCategoryKey('cafe', 'hotplace')).map((p) => p.id),
    ['B', 'A'],
  );
  assert.equal(data.postsById.get('missing'), undefined);
});

test('번역은 글 ID·언어별로 분리하고 분류 트리에 번역과 다국어 여부를 보존', () => {
  const data = createBuildData(rows());
  assert.equal(data.translationsByPostId.get('B').get('en').title, '번역 제목');
  assert.equal(data.translationsByPostId.get('A'), undefined);
  assert.deepEqual(data.categoryTree, [
    {
      slug: 'cafe',
      name: '카페',
      translations: { en: 'Cafe' },
      subCategories: [
        { slug: 'hotplace', name: '핫플', isMultilingual: true, translations: { en: 'Hot Place' } },
      ],
    },
  ]);
});

test('분류 복합 키는 구분자가 포함된 slug에서도 충돌하지 않음', () => {
  assert.notEqual(subCategoryKey('a/b', 'c'), subCategoryKey('a', 'b/c'));
});

test('번역 빈 설명·alt·이미지 배열은 원문으로 대체하고 원문 수정 시각 유지', () => {
  const original = post('B');
  const before = structuredClone(original);
  const localized = resolveLocalizedPost(original, translation('en'), 'en');
  assert.equal(localized.title, '번역 제목');
  assert.equal(localized.content, '번역 본문');
  assert.equal(localized.description, original.description);
  assert.equal(localized.thumbnail_alt, original.thumbnail_alt);
  assert.deepEqual(localized.image_alts, original.image_alts);
  assert.equal(localized.updated_at, original.updated_at);
  assert.deepEqual(original, before);
});

test('번역 값이 존재하면 해당 값 사용, 번역 누락은 정상 원문 대체', () => {
  const original = post('B');
  const localized = resolveLocalizedPost(
    original,
    translation('en', {
      description: '번역 설명',
      thumbnail_alt: '번역 alt',
      image_alts: [{ src: 'image.webp', alt: '번역 이미지' }],
    }),
    'en',
  );
  assert.equal(localized.description, '번역 설명');
  assert.equal(localized.thumbnail_alt, '번역 alt');
  assert.equal(localized.image_alts[0].alt, '번역 이미지');
  const fallback = resolveLocalizedPost(original, undefined, 'ja');
  assert.equal(fallback.title, original.title);
  assert.equal(fallback.translated_place_name, null);
  assert.equal(fallback.locale, 'ja');
});

test('다음 수집 결과는 발행·삭제·수정에 따라 독립적인 인덱스를 만듦', () => {
  const initial = createBuildData(rows());
  const changedRows = rows();
  changedRows.posts = [post('A', { title: '새 제목' }), post('D')];
  const next = createBuildData(changedRows);
  assert.equal(next.postsById.get('B'), undefined);
  assert.equal(next.postsById.get('D').slug, 'slug-D');
  assert.equal(next.postsById.get('A').title, '새 제목');
  assert.equal(initial.postsById.get('A').title, '원문 A');
});
