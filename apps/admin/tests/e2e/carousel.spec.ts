import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { transpileModule, ScriptTarget } from 'typescript';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=',
  'base64',
);
const files = (...names: string[]) =>
  names.map((name) => ({ name, mimeType: 'image/png', buffer: png }));
const browserErrors = new WeakMap<Page, string[]>();
async function openCarousel(page: Page, names = ['one.png', 'two.png']) {
  await page.getByRole('button', { name: '캐러셀 만들기', exact: true }).click();
  await page.getByLabel('이미지 파일 선택').setInputFiles(files(...names));
}
async function createCarousel(page: Page) {
  await openCarousel(page);
  await page.getByRole('button', { name: '생성', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.image-carousel-container')).toHaveCount(1);
}
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', (request) =>
    errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`),
  );
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') await route.continue();
    else {
      errors.push(`테스트 범위 밖 네트워크 요청: ${url.origin}`);
      await route.abort();
    }
  });
  await page.goto('/');
  await expect(page.locator('.tiptap')).toBeVisible();
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

test('선택 버튼은 키보드로 열리고 장수 안내와 추가 선택을 제공한다', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: '캐러셀 만들기', exact: true }).click();
  const picker = page.getByRole('button', { name: '이미지 선택', exact: true });
  await expect(picker).toBeVisible();
  await expect(page.getByText('2장 이상 선택하면 만들 수 있어요.')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('picker-empty.png') });
  await picker.focus();
  const firstChooser = page.waitForEvent('filechooser');
  await picker.press('Enter');
  await (await firstChooser).setFiles(files('one.png'));
  await expect(page.getByText('1장 더 선택해주세요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '생성', exact: true })).toBeDisabled();
  const nextChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '이미지 더 선택' }).click();
  await (await nextChooser).setFiles(files('two.png'));
  await expect(page.getByText('선택한 이미지 2장')).toBeVisible();
  await expect(page.getByRole('button', { name: '생성', exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('picker-selected.png') });
  await page.getByRole('button', { name: 'one.png 제거' }).click();
  await page.getByRole('button', { name: 'two.png 제거' }).click();
  await expect(picker).toBeVisible();
});

test('긴 이미지 목록에서도 실행 버튼은 화면 안에 유지된다', async ({ page }) => {
  await openCarousel(
    page,
    Array.from({ length: 20 }, (_, index) => `${index}.png`),
  );
  const submit = page.getByRole('button', { name: '생성', exact: true });
  await expect(submit).toBeInViewport();
  await expect(page.getByRole('button', { name: '취소', exact: true })).toBeInViewport();
  const dialog = await page.getByRole('dialog').boundingBox();
  expect(dialog!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole('button', { name: '19.png 제거', exact: true }).scrollIntoViewIfNeeded();
  await expect(submit).toBeInViewport();
});

test('선택·미리보기·취소는 업로드와 본문 변경을 발생시키지 않는다', async ({ page }) => {
  const before = await page.getByTestId('saved-html').textContent();
  await openCarousel(page, ['one.png']);
  await expect(page.getByRole('button', { name: '생성', exact: true })).toBeDisabled();
  await expect(page.getByAltText('1번 이미지 미리보기')).toBeVisible();
  await page.getByRole('button', { name: '취소', exact: true }).click();
  expect(await page.getByTestId('saved-html').textContent()).toBe(before);
  expect(
    await page.evaluate(() => (window as unknown as { uploadCalls: string[] }).uploadCalls),
  ).toEqual([]);
});

test('명시적으로 생성하고 1장을 추가한 다음 단일 Undo로 추가만 취소한다', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await createCarousel(page);
  await page.locator('.image-carousel-container').click();
  await page
    .locator('.image-carousel-container')
    .getByRole('button', { name: '이미지 추가', exact: true })
    .click();
  await page.getByLabel('이미지 파일 선택').setInputFiles(files('three.png'));
  await page.getByRole('button', { name: '추가', exact: true }).click();
  await expect(page.locator('.image-carousel-slide')).toHaveCount(3);
  await page.screenshot({ path: testInfo.outputPath('carousel-created.png'), fullPage: true });
  await page.locator('.tiptap').press('ControlOrMeta+z');
  await expect(page.locator('.image-carousel-slide')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('부분 실패는 본문을 변경하지 않고 성공 파일 재업로드 없이 선택 순서를 보존한다', async ({
  page,
}) => {
  await openCarousel(page, ['slow.png', 'fail.png']);
  await page.getByRole('button', { name: '생성', exact: true }).click();
  await expect(page.getByRole('button', { name: '실패한 파일 재시도' })).toBeVisible();
  await expect(page.locator('.image-carousel-container')).toHaveCount(0);
  await page.getByRole('button', { name: '실패한 파일 재시도' }).click();
  await expect(page.locator('.image-carousel-slide')).toHaveCount(2);
  const calls = await page.evaluate(
    () => (window as unknown as { uploadCalls: string[] }).uploadCalls,
  );
  expect(calls.filter((name) => name === 'slow.png')).toHaveLength(1);
  expect(calls.filter((name) => name === 'fail.png')).toHaveLength(2);
  const sources = await page
    .locator('.image-carousel-slide img')
    .evaluateAll((images) =>
      images.map((image) => decodeURIComponent((image as HTMLImageElement).src)),
    );
  expect(sources[0]).toContain('slow.png');
  expect(sources[1]).toContain('fail.png');
});

test('업로드 중 취소 후 늦은 응답은 본문에 삽입되지 않는다', async ({ page }) => {
  await openCarousel(page, ['slow-one.png', 'slow-two.png']);
  await page.getByRole('button', { name: '생성', exact: true }).click();
  await page.getByRole('button', { name: '취소', exact: true }).click();
  await page.waitForTimeout(1100);
  await expect(page.locator('.image-carousel-container')).toHaveCount(0);
});

test('명시적인 크기 조절 및 삭제는 한 장 캐러셀 유지 후 마지막 블록을 제거한다', async ({
  page,
}) => {
  await createCarousel(page);
  await page.locator('.image-carousel-container').click();
  await page.getByRole('button', { name: '1번 이미지 크기 조절', exact: true }).click();
  await page.getByRole('button', { name: '1번 이미지 삭제', exact: true }).click();
  await expect(page.locator('.image-carousel-container')).toHaveCount(1);
  await expect(page.locator('.image-carousel-slide')).toHaveCount(1);
  await page.getByRole('button', { name: '1번 이미지 삭제', exact: true }).click();
  await expect(page.locator('.image-carousel-container')).toHaveCount(0);
});

test('PC 화살표와 모바일 터치 스와이프로 다음 이미지를 탐색한다', async ({ page, isMobile }) => {
  await createCarousel(page);
  const viewport = page.locator('.image-carousel-viewport');
  if (isMobile) {
    const box = (await viewport.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width - 40, y: box.y + 60 }],
    });
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: box.x + box.width - 40 - (i * (box.width - 80)) / 8, y: box.y + 60 }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.locator('.image-carousel-container').hover();
    await page.getByRole('button', { name: '다음 이미지', exact: true }).click();
  }
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(100);
});

test('키보드로 캐러셀 버튼을 실행하고 HTML 모드에서는 업로드 버튼을 비활성화한다', async ({
  page,
}) => {
  const create = page.getByRole('button', { name: '캐러셀 만들기', exact: true });
  await create.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'HTML 소스 모드' }).click();
  await expect(create).toBeDisabled();
  await expect(page.getByRole('button', { name: '이미지 추가', exact: true })).toBeDisabled();
});

test('실패 파일을 제거하면 성공 결과를 재사용하고 중복 생성 요청을 막는다', async ({ page }) => {
  await openCarousel(page, ['slow-one.png', 'two.png', 'fail.png']);
  const submit = page.getByRole('button', { name: '생성', exact: true });
  await submit.evaluate((element: HTMLButtonElement) => {
    element.click();
    element.click();
  });
  await expect(page.getByRole('button', { name: '실패한 파일 재시도' })).toBeVisible();
  await page.getByRole('button', { name: 'fail.png 제거' }).click();
  await page.getByRole('button', { name: '생성', exact: true }).click();
  await expect(page.locator('.image-carousel-slide')).toHaveCount(2);
  expect(
    await page.evaluate(() => (window as unknown as { uploadCalls: string[] }).uploadCalls),
  ).toEqual(['slow-one.png', 'two.png', 'fail.png']);
});

test('저장된 캐러셀 HTML은 실제 Client 스크립트로 표시되고 라이트박스로 확대된다', async ({
  page,
}) => {
  await createCarousel(page);
  const html = (await page.getByTestId('saved-html').textContent())!;
  const src = html.match(/src="([^"]+)"/)![1];
  const legacy = `<div data-type="image-carousel">${['auto', 'ratio:1.5000', '240px', 'auto', 'auto'].map((height) => `<img src="${src}" data-width="30%" data-height="${height}" width="688" height="400" alt="기존 이미지">`).join('')}</div>`;
  const layout = readFileSync(
    new URL('../../../client/src/layouts/PostLayout.astro', import.meta.url),
    'utf8',
  );
  const lightbox = readFileSync(
    new URL('../../../client/src/shared/components/ui/ImageLightbox.astro', import.meta.url),
    'utf8',
  );
  const markup = lightbox
    .split('---')[2]
    .split('<script>')[0]
    .replace(/aria-label=\{t\([^}]+\}/g, 'aria-label="이미지 미리보기"');
  await page.setContent(
    `<style>.hidden{display:none}.flex{display:flex}.fixed{position:fixed}.inset-0{inset:0}[data-type="image-carousel"]{position:relative}.carousel-viewport{display:flex;overflow:auto;scroll-snap-type:x mandatory}.carousel-slide{scroll-snap-align:start}.carousel-slide img{width:100%}#lightbox{background:#111;z-index:50}#lightbox-img{max-width:90vw;max-height:90vh}</style><article itemprop="articleBody" style="max-width:700px">${html}${legacy}</article>${markup}`,
  );
  const scripts = [...layout.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  const carouselScript = scripts.find((script) => script.includes('carousel-viewport'))!;
  const lightboxScript = lightbox.match(/<script>([\s\S]*?)<\/script>/)![1];
  for (const script of [carouselScript, lightboxScript]) {
    await page.addScriptTag({
      content: transpileModule(script, { compilerOptions: { target: ScriptTarget.ES2022 } })
        .outputText,
    });
  }
  await expect(page.locator('.carousel-slide')).toHaveCount(7);
  await expect(page.locator('.carousel-slide').first()).toHaveCSS('flex-basis', '90%');
  await page.locator('.carousel-slide img').first().click();
  await expect(page.locator('#lightbox')).toBeVisible();
  await expect(page.locator('#lightbox-img')).toHaveAttribute(
    'src',
    (await page.locator('.carousel-slide img').first().getAttribute('src')) as string,
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('#lightbox')).toBeHidden();
  const existing = page.locator('[data-type="image-carousel"]').nth(1);
  await expect(existing.locator('img').nth(1)).toHaveCSS('aspect-ratio', '1.5 / 1');
  await expect(existing.locator('img').nth(2)).toHaveCSS('height', '240px');
  await expect(existing.locator('img').first()).toHaveAttribute('width', '688');
  const viewport = existing.locator('.carousel-viewport');
  const firstStop = await viewport.evaluate((element) => element.clientWidth * 0.3);
  await existing.getByRole('button', { name: 'Next', exact: true }).click();
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(firstStop - 2);
  await existing.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(existing.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  const end = await viewport.evaluate((element) => element.scrollLeft);
  await existing.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollLeft))
    .toBeLessThan(end - 20);
});

test('일반 이미지 여러 장은 기존 캐러셀과 자동 병합하지 않는다', async ({ page }) => {
  await createCarousel(page);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '이미지 추가', exact: true }).first().click();
  await (await chooser).setFiles(files('standalone-one.png', 'standalone-two.png'));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.tiptap img:not(.ProseMirror-separator)')).toHaveCount(4);
  await expect(page.locator('.image-carousel-slide')).toHaveCount(2);
  await expect(page.locator('.image-carousel-container')).toHaveCount(1);
});

test('드래그 미리보기의 실제 너비·높이와 저장한 크롭 비율이 일치한다', async ({ page }) => {
  await createCarousel(page);
  await page.getByRole('button', { name: '1번 이미지 크기 조절', exact: true }).click();
  const handle = page.getByRole('button', { name: '1번 이미지 se 크기 조절', exact: true });
  await handle.scrollIntoViewIfNeeded();
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 500, box.y + 40, { steps: 5 });
  const preview = await page.locator('.image-carousel-slide img').first().boundingBox();
  await page.mouse.up();
  const html = (await page.getByTestId('saved-html').textContent())!;
  const ratio = Number(html.match(/data-height="ratio:([\d.]+)"/)![1]);
  expect(ratio).toBeCloseTo(preview!.width / preview!.height, 3);
  expect(html).toContain('data-width="100.0%"');
});

test('캐러셀 편집 범위와 공통 파란 점선 UI는 저장 HTML에 포함되지 않는다', async ({
  page,
}, testInfo) => {
  await createCarousel(page);
  const header = page.locator('.image-carousel-header');
  await expect(header.getByText('캐러셀 · 2장')).toBeVisible();
  await expect(header.getByRole('button', { name: '이미지 추가', exact: true })).toBeVisible();
  await expect(page.locator('.image-carousel-actions').first()).toContainText('1번 이미지');
  await page.getByRole('button', { name: '1번 이미지 크기 조절', exact: true }).click();
  const frame = page.locator('.image-carousel-image').first();
  await expect(frame).toHaveCSS('outline-style', 'dashed');
  await expect(frame).toHaveCSS('outline-color', 'rgb(74, 144, 217)');
  await expect(frame).toHaveCSS('outline-offset', '6px');
  const bounds = await page.locator('.image-carousel-viewport').boundingBox();
  const corner = await page.locator('.image-carousel-handle-nw').first().boundingBox();
  expect(corner!.x).toBeGreaterThanOrEqual(bounds!.x);
  expect(corner!.y).toBeGreaterThanOrEqual(bounds!.y);
  await expect(page.locator('.image-carousel-handle-se').first()).toHaveCSS(
    'background-color',
    'rgb(74, 144, 217)',
  );
  await page.screenshot({ path: testInfo.outputPath('carousel-editor-frame.png'), fullPage: true });
  await page.getByRole('button', { name: '2번 이미지 삭제', exact: true }).click();
  await expect(header.getByText('캐러셀 · 1장')).toBeVisible();
  const html = await page.getByTestId('saved-html').textContent();
  expect(html).not.toMatch(/image-carousel-header|image-resize-frame|번 이미지|캐러셀 ·/);

  await page.locator('.tiptap').press('ControlOrMeta+End');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '이미지 추가', exact: true }).first().click();
  await (await chooser).setFiles(files('standalone.png'));
  const standalone = page.locator(
    '.tiptap img:not(.ProseMirror-separator):not(.image-carousel-slide img)',
  );
  await expect(standalone).toHaveCount(1);
  await standalone.click();
  const selected = page.locator('.image-resize-frame').last();
  await expect(selected).toHaveCSS('outline-style', 'dashed');
  await expect(selected).toHaveCSS('outline-color', 'rgb(74, 144, 217)');
  await expect(selected).toHaveCSS('outline-offset', '6px');
  await expect(standalone).toHaveCSS('margin-top', '0px');
  await expect(standalone).toHaveCSS('margin-bottom', '0px');
  await expect(selected).toHaveCSS('margin-top', '12px');
  const imageBounds = (await standalone.boundingBox())!;
  const frameBounds = (await selected.boundingBox())!;
  expect(frameBounds.y).toBeCloseTo(imageBounds.y, 1);
  expect(frameBounds.height).toBeCloseTo(imageBounds.height, 1);
});

test('일반 이미지는 확인 없이 업로드하고 실패 재시도와 취소를 인라인으로 제공한다', async ({
  page,
}) => {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '이미지 추가', exact: true }).click();
  await (await chooser).setFiles(files('fail.png'));
  await expect(page.getByRole('button', { name: '다시 시도', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.locator('.tiptap img:not(.ProseMirror-separator)')).toHaveCount(1);
  const before = await page.getByTestId('saved-html').textContent();
  const nextChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '이미지 추가', exact: true }).click();
  await (await nextChooser).setFiles(files('slow.png'));
  await page.getByRole('button', { name: '업로드 취소', exact: true }).click();
  await page.waitForTimeout(1000);
  expect(await page.getByTestId('saved-html').textContent()).toBe(before);
  await expect(page.getByRole('button', { name: '이미지 추가', exact: true })).toBeEnabled();
});
