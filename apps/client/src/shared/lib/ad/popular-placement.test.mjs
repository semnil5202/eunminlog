import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const component = readFileSync(new URL('../../components/layout/SponsoredPostList.astro', import.meta.url), 'utf8');
const config = readFileSync(new URL('../../constants/ad.ts', import.meta.url), 'utf8');

test('PC 인기글만 300×100 Display를 사용하고 모바일 Native는 유지한다', () => {
  assert.match(component, /posts.length >= 2/);
  assert.match(component, /advertisementContext === "mobile" \? <InFeedAdsense/);
  assert.match(component, /class="min-h-\[150px\] w-full"/);
  assert.doesNotMatch(component, /max-h-\[150px\]/);
  assert.match(component, /slotKey=\{ADVERTISEMENT_SLOT_KEY.popularList\}/);
  assert.match(component, /h-\[100px\] min-h-\[100px\] max-h-\[100px\] w-\[300px\]/);
  assert.match(component, /slotId="popular_list_fixed"\s+format="display"/);
  assert.match(component, /slotKey=\{ADVERTISEMENT_SLOT_KEY.popularListDesktop\}/);
});

test('인기글과 인접글은 2개 이상일 때 두 번째 글 뒤에 한 번 삽입한다', () => {
  const nearby = readFileSync(new URL('../../../features/post-detail/components/NearbyPostList.astro', import.meta.url), 'utf8');
  assert.match(nearby, /posts.length >= 2/);
  assert.match(nearby, /<\/a>\s+<\/li>\s+\{index === 1 && shouldShowInFeedAdvertisement/);
  assert.doesNotMatch(nearby, /index === 2 && shouldShowInFeedAdvertisement/);
  assert.ok(component.indexOf('posts.slice(0, 2)') < component.indexOf('{shouldShowInFeedAdvertisement &&'));
  assert.ok(component.indexOf('{shouldShowInFeedAdvertisement &&') < component.indexOf('posts.slice(2, 4)'));
  for (const length of [0, 1, 2, 3, 4]) {
    const rows = Array.from({ length }, (_, index) => `글${index + 1}`);
    if (length >= 2) rows.splice(2, 0, '광고');
    assert.equal(rows.includes('광고'), length >= 2);
    if (length >= 2) assert.equal(rows[2], '광고');
  }
});

test('PC 전용 단위는 고정형이며 기존 인기글 폴백과 레이지 로딩을 유지한다', () => {
  assert.match(config, /\[ADVERTISEMENT_SLOT_KEY.popularListDesktop\]: \{\s+enabled: true,\s+placement: 'popularList',\s+adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.popularListDesktop/);
  assert.match(config, /\[ADVERTISEMENT_UNIT_KEY.popularListDesktop\]: isProductionBuild\s+\? \{ slotId: '8482492142', format: 'fixed' \}/);
  assert.match(config, /\[ADVERTISEMENT_SLOT_KEY.popularList\]: \{\s+enabled: true,\s+placement: 'popularList',\s+adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.postBottom/);
  assert.match(config, /popularList: isProductionBuild \? coupangPopularListAdvertisements/);
  const slot = readFileSync(new URL('../../components/ad/AdSlot.astro', import.meta.url), 'utf8');
  assert.match(slot, /loadStrategy = "lazy"/);
  assert.doesNotMatch(component, /loadStrategy="immediate"/);
});

test('하단 두 지면만 전용 가로형 단위를 공유하고 실제 높이 확장을 허용한다', () => {
  const nearby = readFileSync(new URL('../../../features/post-detail/components/NearbyPostList.astro', import.meta.url), 'utf8');
  const runtime = readFileSync(new URL('./mediation.ts', import.meta.url), 'utf8');
  assert.match(config, /const postBottomAdSenseUnit: AdSenseUnitConfig = \{\s+slotId: '4186599463',\s+format: 'fluid',\s+layoutKey: '-h0-h\+j-90\+m4'/);
  assert.match(config, /\[ADVERTISEMENT_SLOT_KEY.nearbyList\]: \{\s+enabled: true,\s+placement: 'nearbyList',\s+adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.postBottom/);
  assert.match(config, /\[ADVERTISEMENT_UNIT_KEY.postBottom\]: isProductionBuild \? postBottomAdSenseUnit : null/);
  assert.match(config, /slotId: '6392269057'/);
  assert.match(nearby, /class="min-h-\[150px\] w-full"/);
  assert.doesNotMatch(nearby, /max-h-\[150px\]/);
  assert.match(runtime, /adsenseElement.style.height = '150px'/);
});
