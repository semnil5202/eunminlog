import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getFeedAdvertisementIndex } from './feed-placement.ts';

test('게시글 2·7·12·17번째 직전에서 두 슬롯을 교대로 사용한다', () => {
  const placements = Array.from({ length: 30 }, (_, index) => [
    index,
    getFeedAdvertisementIndex(index),
  ]).filter(([, slot]) => slot !== null);
  assert.deepEqual(placements, [
    [1, 0],
    [6, 1],
    [11, 0],
    [16, 1],
    [21, 0],
    [26, 1],
  ]);
});

test('10개 페이지 및 마지막 짧은 페이지 경계에서도 간격을 유지한다', () => {
  let loaded = 0;
  const positions = [];
  for (const length of [10, 10, 3]) {
    for (let index = 0; index < length; index++) {
      if (getFeedAdvertisementIndex(loaded + index) !== null) positions.push(loaded + index + 1);
    }
    loaded += length;
  }
  assert.deepEqual(positions, [2, 7, 12, 17, 22]);
  assert.equal(getFeedAdvertisementIndex(0), null);
  assert.equal(getFeedAdvertisementIndex(-4), null);
});

test('SSG 조회 6종은 모두 10개 기본값을 사용하고 JSON은 v2 경로로 생성한다', () => {
  const posts = readFileSync(
    new URL('../../../features/post-feed/api/posts.ts', import.meta.url),
    'utf8',
  );
  assert.equal((posts.match(/perPage = 10/g) ?? []).length, 6);
  assert.doesNotMatch(posts, /perPage = 9/);
  const route = readFileSync(
    new URL('../../../pages/api/feed/[...path].json.ts', import.meta.url),
    'utf8',
  );
  assert.equal((route.match(/path: `v2\//g) ?? []).length, 3);
});
