import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=',
  'base64',
);
const files = (...names: string[]) =>
  names.map((name) => ({ name, mimeType: 'image/png', buffer: png }));
const images = (page: Page) => page.locator('.tiptap img:not(.ProseMirror-separator)');
const tools = (page: Page) => page.getByRole('toolbar', { name: '모자이크 도구' });
const calls = (page: Page) =>
  page.evaluate(() => (window as unknown as { uploadCalls: string[] }).uploadCalls);
const errors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const caught: string[] = [];
  errors.set(page, caught);
  page.on('pageerror', (error) => caught.push(error.message));
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') await route.continue();
    else {
      caught.push(`허용되지 않은 요청: ${route.request().url()}`);
      await route.abort();
    }
  });
  await page.goto('/');
  await expect(page.locator('.tiptap')).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function openSingle(page: Page) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '이미지 추가', exact: true }).click();
  await (await chooser).setFiles(files('portrait.png'));
  await expect(images(page)).toHaveCount(1);
  await images(page).click();
  await page.getByRole('button', { name: '모자이크', exact: true }).click();
  await expect(tools(page).getByRole('button', { name: '영역 추가', exact: true })).toBeEnabled();
}

test('확대 모달은 도구와 포커스를 유지하고 Escape로 변경 없이 닫힌다', async ({ page }) => {
  await openSingle(page);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const before = await page.getByTestId('saved-html').textContent();
  const viewport = page.viewportSize()!;
  const dialogBox = (await dialog.boundingBox())!;
  expect(dialogBox.width).toBeGreaterThan(viewport.width * 0.9);
  const toolbarBox = (await tools(page).boundingBox())!;
  expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(viewport.height);
  const stage = page.getByRole('group', { name: '모자이크 편집 영역' });
  const stageBox = (await stage.boundingBox())!;
  const photoBox = (await page.locator('[data-mosaic-editor] canvas').boundingBox())!;
  if (photoBox.y - stageBox.y > 5) {
    await stage.click({ position: { x: 2, y: 2 } });
    await expect(page.getByRole('button', { name: '1번 모자이크 영역' })).toHaveCount(0);
  }
  if (dialogBox.x > 5) {
    await page.mouse.click(2, 2);
    await expect(dialog).toBeVisible();
  }
  await tools(page).getByRole('button', { name: '영역 추가' }).click();
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(await page.getByTestId('saved-html').textContent()).toBe(before);
  expect(await calls(page)).toEqual(['portrait.png']);
});

test('영역 추가·키보드 이동과 크기 조절·삭제 후 취소는 업로드하지 않는다', async ({ page }) => {
  await openSingle(page);
  const before = await page.getByTestId('saved-html').textContent();
  await tools(page).getByRole('button', { name: '영역 추가', exact: true }).click();
  const region = page.getByRole('button', { name: '1번 모자이크 영역' });
  const initial = await region.boundingBox();
  const picture = (await page.locator('[data-mosaic-editor] canvas').boundingBox())!;
  const expectedSide = Math.min(picture.width, picture.height) * 0.09;
  expect(Math.abs(initial!.width - expectedSide)).toBeLessThan(1);
  expect(Math.abs(initial!.height - expectedSide)).toBeLessThan(1);
  await region.focus();
  await region.press('ArrowRight');
  await expect.poll(async () => (await region.boundingBox())!.x).toBeGreaterThan(initial!.x);
  await region.press('Shift+ArrowRight');
  await expect
    .poll(async () => (await region.boundingBox())!.width)
    .toBeGreaterThan(initial!.width);
  const beforeDrag = (await region.boundingBox())!;
  await page.mouse.move(beforeDrag.x + beforeDrag.width / 2, beforeDrag.y + beforeDrag.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    beforeDrag.x + beforeDrag.width / 2 + 12,
    beforeDrag.y + beforeDrag.height / 2 + 10,
    { steps: 3 },
  );
  await page.mouse.up();
  await expect.poll(async () => (await region.boundingBox())!.x).toBeGreaterThan(beforeDrag.x + 5);
  const beforeResize = (await region.boundingBox())!;
  const corner = (await region.locator('[data-corner="se"]').boundingBox())!;
  expect(corner.width).toBe(10);
  expect(corner.height).toBe(10);
  await page.mouse.move(corner.x + corner.width / 2, corner.y + corner.height / 2);
  await page.mouse.down();
  await page.mouse.move(corner.x + corner.width / 2 + 12, corner.y + corner.height / 2 + 12, {
    steps: 3,
  });
  await page.mouse.up();
  await expect
    .poll(async () => (await region.boundingBox())!.width)
    .toBeGreaterThan(beforeResize.width + 5);
  await tools(page).getByRole('button', { name: '영역 삭제', exact: true }).click();
  await expect(region).toHaveCount(0);
  await expect(tools(page).getByRole('button')).toHaveCount(4);
  await expect(tools(page).getByRole('button', { name: '취소', exact: true })).toHaveCSS(
    'border-top-width',
    '1px',
  );
  await expect(tools(page).getByRole('button', { name: '되돌리기', exact: true })).toHaveCount(0);
  for (const button of await tools(page).getByRole('button').all()) {
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  const addBox = (await tools(page).getByRole('button', { name: '영역 추가' }).boundingBox())!;
  const deleteBox = (await tools(page).getByRole('button', { name: '영역 삭제' }).boundingBox())!;
  expect(deleteBox.x - addBox.x - addBox.width).toBeGreaterThanOrEqual(8);
  await tools(page).getByRole('button', { name: '취소', exact: true }).click();
  await expect(tools(page)).toHaveCount(0);
  expect(await page.getByTestId('saved-html').textContent()).toBe(before);
  expect(await calls(page)).toEqual(['portrait.png']);
});

test('사진 클릭 또는 탭으로 생성한 모자이크를 적용하고 본문 Undo로 복원한다', async ({
  page,
}, testInfo) => {
  await openSingle(page);
  const source = await images(page).getAttribute('src');
  const before = await page.getByTestId('saved-html').textContent();
  const area = page.getByRole('group', { name: '모자이크 편집 영역' });
  const box = (await area.boundingBox())!;
  const photo = (await page.locator('[data-mosaic-editor] canvas').boundingBox())!;
  const position = {
    x: photo.x - box.x + photo.width * 0.5,
    y: photo.y - box.y + photo.height * 0.7,
  };
  if (testInfo.project.name === 'mobile') await area.tap({ position });
  else await area.click({ position });
  await expect(page.getByRole('button', { name: '1번 모자이크 영역' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mosaic-preview.png'), fullPage: true });
  await tools(page).getByRole('button', { name: '적용', exact: true }).click();
  await expect(tools(page)).toHaveCount(0);
  await expect(images(page)).not.toHaveAttribute('src', source!);
  expect(await calls(page)).toEqual(['portrait.png', 'mosaic.png']);
  expect(
    await page.evaluate(() => (window as unknown as { mosaicWatermark: boolean }).mosaicWatermark),
  ).toBe(false);
  await page.locator('.tiptap').press('ControlOrMeta+z');
  await expect(page.getByTestId('saved-html')).toHaveText(before!);
});

test('저장 실패는 원본과 초안을 보존하고 재시도할 수 있다', async ({ page }) => {
  await openSingle(page);
  const before = await page.getByTestId('saved-html').textContent();
  await tools(page).getByRole('button', { name: '영역 추가' }).click();
  await page.evaluate(() => Object.assign(window, { mosaicFail: true }));
  await tools(page).getByRole('button', { name: '적용', exact: true }).click();
  await expect(page.getByText('테스트 모자이크 업로드 실패', { exact: true })).toBeVisible();
  await expect(tools(page).getByRole('button', { name: '적용', exact: true })).toBeEnabled();
  expect(await page.getByTestId('saved-html').textContent()).toBe(before);
  await tools(page)
    .getByRole('button', { name: '적용', exact: true })
    .evaluate((button) => button.scrollIntoView({ block: 'center' }));
  await tools(page).getByRole('button', { name: '적용', exact: true }).click();
  await expect(tools(page)).toHaveCount(0);
  expect(await calls(page)).toEqual(['portrait.png', 'mosaic.png', 'mosaic.png']);
});

test('저장 중 취소 후 늦은 결과를 무시하고 다시 편집할 수 있다', async ({ page }) => {
  await openSingle(page);
  const before = await page.getByTestId('saved-html').textContent();
  await tools(page).getByRole('button', { name: '영역 추가' }).click();
  await page.evaluate(() => Object.assign(window, { mosaicDelay: 1800 }));
  await tools(page).getByRole('button', { name: '적용', exact: true }).click();
  await expect.poll(() => calls(page)).toContain('mosaic.png');
  await tools(page).getByRole('button', { name: '취소', exact: true }).click();
  await images(page).click();
  await page.getByRole('button', { name: '모자이크', exact: true }).click();
  await expect(tools(page).getByRole('button', { name: '영역 추가' })).toBeEnabled();
  await page.waitForTimeout(1900);
  expect(await page.getByTestId('saved-html').textContent()).toBe(before);
  await expect(tools(page)).toBeVisible();
});

test('Undo로 대상 이미지가 제거되면 편집 세션도 종료한다', async ({ page }) => {
  await openSingle(page);
  await page
    .locator('button')
    .filter({ has: page.locator('svg title', { hasText: /^Undo$/ }) })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(images(page)).toHaveCount(0);
  await expect(tools(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: '이미지 추가', exact: true })).toBeEnabled();
});

test('캐러셀 모자이크는 대상만 교체하고 순서·치수와 스와이프를 보존한다', async ({ page }) => {
  await page.getByRole('button', { name: '캐러셀 만들기', exact: true }).click();
  await page.getByLabel('이미지 파일 선택').setInputFiles(files('first.png', 'second.png'));
  await page.getByRole('button', { name: '생성', exact: true }).click();
  await expect(page.locator('.image-carousel-slide')).toHaveCount(2);
  const original = await images(page).evaluateAll((nodes) =>
    nodes.map((node) => ({
      src: node.getAttribute('src'),
      width: node.getAttribute('width'),
      height: node.getAttribute('height'),
      style: node.getAttribute('style'),
    })),
  );
  await page.locator('.image-carousel-slide img').first().click();
  await page.getByRole('button', { name: '1번 이미지 모자이크', exact: true }).click();
  await expect(tools(page).getByRole('button', { name: '영역 추가' })).toBeEnabled();
  await tools(page).getByRole('button', { name: '영역 추가' }).click();
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  await tools(page).getByRole('button', { name: '적용', exact: true }).click();
  await expect(tools(page)).toHaveCount(0);
  await expect(images(page).first()).not.toHaveAttribute('src', original[0].src!);
  const updated = await images(page).evaluateAll((nodes) =>
    nodes.map((node) => ({
      src: node.getAttribute('src'),
      width: node.getAttribute('width'),
      height: node.getAttribute('height'),
      style: node.getAttribute('style'),
    })),
  );
  expect(updated[1]).toEqual(original[1]);
  expect({ ...updated[0], src: original[0].src }).toEqual(original[0]);
  await expect(page.locator('.image-carousel-viewport')).not.toHaveCSS('overflow-x', 'hidden');
});

test('실제 Canvas는 선택 영역 픽셀만 변경하고 원본 크기를 유지한다', async ({ page }) => {
  const result = await page.evaluate(
    async (modulePath) => {
      const { renderMosaic } = await import(modulePath);
      const original = document.createElement('canvas');
      original.width = 80;
      original.height = 80;
      const context = original.getContext('2d')!;
      for (let x = 0; x < 80; x++) {
        context.fillStyle = x % 2 ? '#fff' : '#000';
        context.fillRect(x, 0, 1, 80);
      }
      const image = new Image();
      image.src = original.toDataURL();
      await image.decode();
      const edited = renderMosaic(image, [
        { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      ]) as HTMLCanvasElement;
      const before = context.getImageData(0, 0, 80, 80).data;
      const after = edited.getContext('2d')!.getImageData(0, 0, 80, 80).data;
      let changedInside = 0;
      let changedOutside = 0;
      for (let y = 0; y < 80; y++)
        for (let x = 0; x < 80; x++) {
          if (before[(y * 80 + x) * 4] !== after[(y * 80 + x) * 4]) {
            if (x >= 20 && x < 60 && y >= 20 && y < 60) changedInside++;
            else changedOutside++;
          }
        }
      return { width: edited.width, height: edited.height, changedInside, changedOutside };
    },
    `/@fs${fileURLToPath(new URL('../../src/features/post-editor/lib/mosaic.ts', import.meta.url))}`,
  );
  expect(result.width).toBe(80);
  expect(result.height).toBe(80);
  expect(result.changedInside).toBeGreaterThan(0);
  expect(result.changedOutside).toBe(0);
});
