import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COUPANG_LARGE_SCREEN_MEDIA_QUERY,
  selectCoupangDynamicAdvertisementVariant,
} from './coupang-variant.ts';

const defaultVariant = { sourceUrl: 'mobile', width: 300, height: 250 };
const largeScreenVariant = { sourceUrl: 'desktop', width: 680, height: 140 };

test('대형 쿠팡 배너 전환점은 1280px이다', () => {
  assert.equal(COUPANG_LARGE_SCREEN_MEDIA_QUERY, '(min-width: 1280px)');
});

test('1280px 미만 화면에서는 기본 300×250 변형을 선택한다', () => {
  assert.equal(
    selectCoupangDynamicAdvertisementVariant(defaultVariant, largeScreenVariant, false),
    defaultVariant,
  );
});

test('1280px 이상 화면에서는 680×140 변형을 선택한다', () => {
  assert.equal(
    selectCoupangDynamicAdvertisementVariant(defaultVariant, largeScreenVariant, true),
    largeScreenVariant,
  );
});

test('대형 변형이 없는 지면은 큰 화면에서도 기본 변형을 선택한다', () => {
  assert.equal(
    selectCoupangDynamicAdvertisementVariant(defaultVariant, undefined, true),
    defaultVariant,
  );
});
