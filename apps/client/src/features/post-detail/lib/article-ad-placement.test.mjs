import assert from 'node:assert/strict';
import test from 'node:test';

import { getEligibleSecondLevelHeadingIndexes } from './article-ad-placement.ts';

const createArticle = (precedingContent) => `${precedingContent}<h2>다음 섹션</h2>`;

test('표시 텍스트가 249자이면 광고를 삽입하지 않는다', () => {
  assert.deepEqual(getEligibleSecondLevelHeadingIndexes(createArticle('가'.repeat(249)), 10), []);
});

test('표시 텍스트가 250자이면 광고를 삽입한다', () => {
  assert.deepEqual(getEligibleSecondLevelHeadingIndexes(createArticle('가'.repeat(250)), 10), [1]);
});

test('직전 섹션에 이미지가 있으면 글자 수와 관계없이 삽입한다', () => {
  assert.deepEqual(
    getEligibleSecondLevelHeadingIndexes(createArticle('<img src="/image.webp" alt="이미지">'), 10),
    [1],
  );
});

test('공백 엔티티는 표시 글자 수에 포함하지 않는다', () => {
  assert.deepEqual(
    getEligibleSecondLevelHeadingIndexes(createArticle('&nbsp;'.repeat(250)), 10),
    [],
  );
});

test('일반 문자 엔티티는 표시 글자 한 자로 계산한다', () => {
  assert.deepEqual(
    getEligibleSecondLevelHeadingIndexes(createArticle('&amp;'.repeat(250)), 10),
    [1],
  );
});

test('연속 H2 사이에는 광고를 삽입하지 않는다', () => {
  const html = `${'가'.repeat(250)}<h2>첫 섹션</h2><h2>두 번째 섹션</h2>`;
  assert.deepEqual(getEligibleSecondLevelHeadingIndexes(html, 10), [1]);
});

test('적격 H2가 10개를 초과해도 최대 10개만 반환한다', () => {
  const sections = Array.from(
    { length: 12 },
    (_, sectionIndex) => `<h2>섹션 ${sectionIndex + 1}</h2>${'가'.repeat(250)}`,
  ).join('');
  const html = `${'가'.repeat(250)}${sections}`;

  assert.deepEqual(
    getEligibleSecondLevelHeadingIndexes(html, 10),
    Array.from({ length: 10 }, (_, arrayIndex) => arrayIndex + 1),
  );
});
