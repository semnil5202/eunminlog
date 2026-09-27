import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { formatDate } from './date.ts';

const expected = {
  ko: '2026년 9월 27일',
  en: 'September 27, 2026',
  ja: '2026年9月27日',
  'zh-CN': '2026年9月27日',
  'zh-TW': '2026年9月27日',
  id: '27 September 2026',
  vi: '27 tháng 9, 2026',
  th: '27 กันยายน 2569',
};

for (const [locale, date] of Object.entries(expected)) {
  test(`${locale}: KST 자정부터 같은 날짜를 언어별 형식으로 표시한다`, () => {
    assert.equal(formatDate('2026-09-26T15:00:00Z', locale), date);
    assert.equal(formatDate('2026-09-27T14:59:59Z', locale), date);
    assert.notEqual(formatDate('2026-09-26T14:59:59Z', locale), date);
  });
}

for (const path of [
  '../../features/post-feed/components/PostCard.astro',
  '../../features/post-feed/components/SponsoredCard.astro',
  '../../pages/api/feed/[...path].json.ts',
  '../../features/search/api/search-data.ts',
  '../../layouts/PostLayout.astro',
]) {
  test(`${path}: 공통 KST 날짜 함수를 사용한다`, () => {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /formatDate\((?:post|p)\.created_at, locale\)/);
    assert.doesNotMatch(source, /toLocaleDateString/);
  });
}
