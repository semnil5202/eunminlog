import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPageModel, cardCacheModel, selectNearbyPosts } from './page-cache-model.ts';

const post = {
  slug: 'cafe-a',
  title: '카페 A',
  description: '설명',
  category: 'cafe',
  sub_category: 'hotplace',
  thumbnail: '/a.webp',
  thumbnail_alt: null,
  is_sponsored: false,
  is_recommended: false,
  created_at: '2026-01-01',
  updated_at: '2026-01-02',
  content: '본문',
  place_name: '장소',
  translated_place_name: null,
};

test('객체 키 입력 순서는 해시에 영향이 없고 배열 순서는 보존', () => {
  assert.equal(
    hashPageModel({ a: 1, b: { x: 1, y: 2 } }),
    hashPageModel({ b: { y: 2, x: 1 }, a: 1 }),
  );
  assert.notEqual(hashPageModel(['A', 'B']), hashPageModel(['B', 'A']));
});

test('카드에 표시하지 않는 본문과 수정 시각 변경은 카드 해시 유지', () => {
  assert.equal(
    hashPageModel(cardCacheModel(post)),
    hashPageModel(
      cardCacheModel({
        ...post,
        content: '새 본문',
        updated_at: '2026-02-01',
      }),
    ),
  );
});

for (const [field, value] of Object.entries({
  title: '새 제목',
  description: '새 설명',
  slug: 'new-slug',
  thumbnail: '/new.webp',
  thumbnail_alt: '새 대체 텍스트',
  category: 'travel',
  sub_category: 'hotel',
  is_sponsored: true,
  is_recommended: true,
  translated_place_name: 'Translated place',
})) {
  test(`카드의 ${field} 변경은 해시 변경`, () => {
    assert.notEqual(
      hashPageModel(cardCacheModel(post)),
      hashPageModel(cardCacheModel({ ...post, [field]: value })),
    );
  });
}

test('인접 글은 현재 글을 포함하고 첫 글·마지막 글 경계 규칙 유지', () => {
  const posts = ['A', 'B', 'C', 'D', 'E'].map((slug) => ({ slug }));
  assert.deepEqual(
    selectNearbyPosts(posts, 'A').map((entry) => entry.slug),
    ['A', 'B', 'C', 'D'],
  );
  assert.deepEqual(
    selectNearbyPosts(posts, 'C').map((entry) => entry.slug),
    ['B', 'C', 'D', 'E'],
  );
  assert.deepEqual(
    selectNearbyPosts(posts, 'E').map((entry) => entry.slug),
    ['D', 'E'],
  );
});

test('같은 글 ID여도 카드 제목 변경은 포함 페이지 해시 변경', () => {
  const model = (entry) => ({ nearby: [cardCacheModel(entry)] });
  assert.notEqual(hashPageModel(model(post)), hashPageModel(model({ ...post, title: '새 제목' })));
});

test('원문 수정 시각·빌드 연도·환경 변경은 해당 페이지 키 변경', () => {
  const model = { post, year: 2026, stage: 'production' };
  for (const next of [
    { ...model, post: { ...post, updated_at: '2026-02-01' } },
    { ...model, year: 2027 },
    { ...model, stage: 'development' },
  ])
    assert.notEqual(hashPageModel(model), hashPageModel(next));
});
