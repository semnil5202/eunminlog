import assert from 'node:assert/strict';
import test from 'node:test';
import { isInternalLink, normalizeLinkRel, normalizeInternalLinkRels } from './link-policy.ts';

test('내부 도메인과 상대 주소만 내부 링크로 판단한다', () => {
  for (const href of [
    'https://eunminlog.site/a',
    'https://www.eunminlog.site/a',
    'https://dev.eunminlog.site/a',
    '/a',
    '#a',
    '//www.eunminlog.site/a',
  ]) {
    assert.equal(isInternalLink(href), true, href);
  }
  for (const href of [
    'https://fakeeunminlog.site',
    'https://eunminlog.site.example.com',
    'https://eunminlog.site@evil.com',
    '//example.com/a',
    'mailto:a@eunminlog.site',
    'javascript:alert(1)',
    '',
  ]) {
    assert.equal(isInternalLink(href), false, href);
  }
});

test('내부 nofollow만 제거하고 sponsored·보안 속성 및 외부 링크는 유지한다', () => {
  assert.equal(
    normalizeLinkRel('/post', 'noopener nofollow noreferrer sponsored'),
    'noopener noreferrer sponsored',
  );
  assert.equal(normalizeLinkRel('/post', 'NOFOLLOW'), '');
  assert.equal(normalizeLinkRel('https://external.com', 'nofollow noopener'), 'nofollow noopener');
});

test('기존 본문: 내부 일반 링크·북마크를 정규화하고 외부 링크는 변경하지 않는다', () => {
  const html =
    '<a href="/post" rel="nofollow noopener">글</a><aside><a rel="nofollow" href="https://www.eunminlog.site/post">북마크</a></aside><a href="https://other.com" rel="nofollow">외부</a>';
  const expected =
    '<a href="/post" rel="noopener">글</a><aside><a href="https://www.eunminlog.site/post">북마크</a></aside><a href="https://other.com" rel="nofollow">외부</a>';
  assert.equal(normalizeInternalLinkRels(html), expected);
  assert.equal(normalizeInternalLinkRels(expected), expected);
});

test('따옴표·속성 순서·대소문자와 data-href를 구분한다', () => {
  assert.equal(
    normalizeInternalLinkRels("<A REL='NOFOLLOW noopener' HREF='/post'>글</A>"),
    '<A rel="noopener" HREF=\'/post\'>글</A>',
  );
  assert.equal(
    normalizeInternalLinkRels('<a href=/post rel=nofollow>글</a>'),
    '<a href=/post>글</a>',
  );
  const external = '<a data-href="/post" href="https://other.com" rel="nofollow">외부</a>';
  assert.equal(normalizeInternalLinkRels(external), external);
  assert.equal(
    normalizeInternalLinkRels('<a href="/post" title="nofollow">글</a>'),
    '<a href="/post" title="nofollow">글</a>',
  );
});
