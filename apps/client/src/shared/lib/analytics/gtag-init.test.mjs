import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { trackEvent } from './gtag.ts';

const layout = readFileSync(new URL('../../../layouts/Layout.astro', import.meta.url), 'utf8');
const source = layout.match(
  /<script is:inline define:vars=\{\{ GA_MEASUREMENT_ID, gaPageParams \}\}>([\s\S]*?)<\/script>/,
)[1];

test('Astro 함수 범위에서도 전역 추적과 최초 클릭을 초기화 뒤에 연결한다', () => {
  const appended = [];
  const handlers = new Map();
  const context = vm.createContext({
    document: {
      createElement: () => ({}),
      head: { appendChild: (node) => appended.push(node) },
    },
    location: { hostname: 'local-client.eunminlog.site' },
    addEventListener: (name, callback) => handlers.set(name, callback),
  });
  context.window = context;
  vm.runInContext(
    `(function(){const GA_MEASUREMENT_ID='G-TEST';const gaPageParams={page_type:'post'};${source}})();`,
    context,
  );
  assert.equal(typeof context.gtag, 'function');
  assert.deepEqual(
    Array.from(context.dataLayer, (args) => args[0]),
    ['js', 'config'],
  );
  assert.equal(appended.length, 0);

  const previousWindow = globalThis.window;
  try {
    globalThis.window = context;
    trackEvent('copy_link_click', { placement: 'post_top' });
    assert.deepEqual(
      Array.from(context.dataLayer, (args) => args[0]),
      ['js', 'config', 'event'],
    );
    assert.equal(context.dataLayer[2][1], 'copy_link_click');
    assert.equal(context.dataLayer[2][2].placement, 'post_top');
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }

  handlers.get('click')();
  handlers.get('scroll')();
  assert.equal(appended.length, 1);
  assert.equal(appended[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-TEST');
  assert.equal(Array.from(context.dataLayer).filter((args) => args[0] === 'config').length, 1);
});
