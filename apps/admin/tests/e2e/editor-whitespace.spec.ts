import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'HTML 소스 모드' }).click();
  await page
    .locator('textarea')
    .fill(Array.from({ length: 60 }, (_, index) => `<p>문단 ${index}</p>`).join(''));
  await page.getByRole('button', { name: 'HTML 소스 모드' }).click();
});

test('외곽 여백 클릭이 글 끝으로 커서와 화면을 이동시키지 않는다', async ({ page }) => {
  const paragraph = page.locator('.tiptap p').first();
  await paragraph.click();
  const box = (await paragraph.boundingBox())!;
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.click(box.x - 8, box.y + box.height / 2);
  await page.waitForTimeout(150);
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(3);
  expect(await page.evaluate(() => window.getSelection()?.anchorNode?.textContent)).not.toBe(
    '문단 59',
  );
});

test('본문 문장 오른쪽 여백 클릭은 해당 문단에 이어서 입력한다', async ({ page }) => {
  const paragraph = page.locator('.tiptap p').first();
  const box = (await paragraph.boundingBox())!;
  await page.mouse.click(box.x + box.width - 8, box.y + box.height / 2);
  await page.keyboard.type(' 이어쓰기');
  await expect(paragraph).toHaveText('문단 0 이어쓰기');
});
