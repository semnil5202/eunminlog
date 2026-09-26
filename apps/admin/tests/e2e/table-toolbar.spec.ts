import { expect, test, type Page } from '@playwright/test';

async function expectAttached(page: Page) {
  const settings = page.getByRole('toolbar', { name: '표 설정' });
  await expect(settings).toBeVisible();
  await expect
    .poll(async () => {
      const toolbar = await page.locator('[data-editor-toolbar]').boundingBox();
      const bar = await settings.boundingBox();
      return Math.abs(bar!.y - (toolbar!.y + toolbar!.height));
    })
    .toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.tiptap')).toBeVisible();
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('main')!.style.marginTop = '500px';
    document.querySelector<HTMLElement>('.tiptap')!.style.minHeight = '1800px';
  });
  await page.getByRole('button', { name: '표 삽입' }).click();
});

test('표 설정은 위아래 스크롤과 리사이즈 시 기본 툴바 하단에 붙는다', async ({ page }) => {
  for (const y of [900, 400, 0, 900]) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(y);
    await expectAttached(page);
  }
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: size.width - 40, height: size.height });
  await expectAttached(page);
  await page.getByRole('button', { name: '+열', exact: true }).click();
  await expect(page.locator('.tiptap tr').first().locator('th, td')).toHaveCount(4);
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByRole('toolbar', { name: '표 설정' })).toHaveCount(0);
});

test('중첩 스크롤 영역에서도 표 설정이 툴바를 따라간다', async ({ page }) => {
  await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('main')!;
    main.style.marginTop = '0';
    main.style.height = '500px';
    main.style.overflow = 'auto';
    const spacer = document.createElement('div');
    spacer.style.height = '250px';
    main.prepend(spacer);
    window.scrollTo(0, 0);
  });
  for (const y of [600, 150, 0, 600]) {
    await page.locator('main').evaluate((element, y) => element.scrollTo(0, y), y);
    await expect.poll(() => page.locator('main').evaluate((element) => element.scrollTop)).toBe(y);
    await expectAttached(page);
  }
});
