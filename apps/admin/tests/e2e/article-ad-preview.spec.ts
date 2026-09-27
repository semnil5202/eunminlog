import { expect, test } from '@playwright/test';

test('광고 예약 공간은 H2 앞에 표시되고 포커스와 저장 본문에 포함되지 않는다', async ({ page }) => {
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'HTML 소스 모드' }).click();
  await page
    .locator('textarea')
    .fill(`<p>${'가'.repeat(250)}</p><h2>다음 제목</h2><p>짧은 글</p><h2>마지막 제목</h2>`);
  await page.getByRole('button', { name: 'HTML 소스 모드' }).click();
  const preview = page.locator('.article-ad-preview');
  await expect(preview).toHaveCount(1);
  await expect(preview).toHaveText('in article adsense');
  await expect(preview).toHaveCSS('min-height', '250px');
  await expect(preview).toHaveCSS('margin-top', '40px');
  await expect(preview).toHaveCSS('margin-bottom', '40px');
  expect(await preview.evaluate((node) => node.nextElementSibling?.textContent)).toBe('다음 제목');
  const other = page.getByRole('textbox', { name: '다른 입력란' });
  await other.focus();
  await preview.click();
  await expect(other).toBeFocused();
  expect(await preview.getAttribute('tabindex')).toBeNull();
  await expect(page.getByTestId('saved-html')).not.toContainText('in article adsense');
  await expect(page.getByTestId('saved-html')).not.toContainText('article-ad-preview');
});

test('Markdown H2와 Undo/Redo에 맞춰 광고 미리보기를 갱신한다', async ({ page }) => {
  await page.goto('/');
  const editor = page.locator('.tiptap');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText('가'.repeat(250));
  await page.keyboard.press('Enter');
  await page.keyboard.type('# ');
  await expect(editor.locator('h2')).toHaveCount(1);
  await expect(page.locator('.article-ad-preview')).toHaveCount(1);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.article-ad-preview')).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(page.locator('.article-ad-preview')).toHaveCount(1);
});
