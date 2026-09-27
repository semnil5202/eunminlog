import { expect, test, type Page } from '@playwright/test';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=',
  'base64',
);
const files = (names: string[]) =>
  names.map((name) => ({ name, mimeType: 'image/png', buffer: png }));
async function upload(page: Page, carousel = false) {
  if (carousel) {
    await page.getByRole('button', { name: '캐러셀 만들기', exact: true }).click();
    await page.getByLabel('이미지 파일 선택').setInputFiles(files(['one.png', 'two.png']));
    await page.getByRole('button', { name: '생성', exact: true }).click();
  } else {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: '이미지 추가', exact: true }).click();
    await (await chooser).setFiles(files(['one.png']));
  }
  await expect(page.locator('.tiptap img').first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await page.route('**/alt-fixture/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="688" height="400"><rect width="688" height="400" fill="#749b81"/></svg>',
    }),
  );
  await page.goto('/?alt');
  await expect(page.locator('.tiptap')).toBeVisible();
});

test('사진 하단 alt와 드로어가 양방향 공유되고 사진 크기에는 영향이 없다', async ({ page }) => {
  await upload(page);
  const picture = page.locator('.tiptap img').first();
  const original = await picture.boundingBox();
  await picture.click();
  const inline = page.locator('.image-alt-field input');
  await inline.fill('맛집 내부 ');
  const field = page.locator('.image-alt-field');
  await expect(field).toHaveCSS('padding', '16px');
  await expect(field).toHaveCSS('border-top-width', '1px');
  await expect(field).toHaveCSS('border-top-color', 'rgb(74, 144, 217)');
  await inline.pressSequentially('view');
  await expect(inline).toBeFocused();
  await expect(inline).toHaveValue('맛집 내부 view');
  expect((await picture.boundingBox())!.height).toBe(original!.height);
  await page.getByLabel('썸네일 이미지 설명 (alt)', { exact: true }).fill('썸네일 설명');
  await page.getByRole('button', { name: '이미지 alt 입력', exact: true }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByLabel('이미지 1 설명 (alt)')).toHaveValue('맛집 내부 view');
  await drawer.getByLabel('이미지 1 설명 (alt)').fill('새로운 설명');
  await drawer.getByLabel('썸네일 이미지 설명 (alt)').fill('변경 썸네일');
  await drawer.getByRole('button', { name: '완료', exact: true }).click();
  await picture.click();
  await expect(inline).toHaveValue('새로운 설명');
  await expect(page.getByLabel('썸네일 이미지 설명 (alt)', { exact: true })).toHaveValue(
    '변경 썸네일',
  );
  expect(await page.getByTestId('saved-html').textContent()).not.toContain('image-alt-field');
});

test('캐러셀은 선택 사진 alt만 표시하고 다른 사진의 설명을 보존한다', async ({ page }) => {
  await upload(page, true);
  const pictures = page.locator('.image-carousel-slide img');
  await pictures.first().click();
  await page.getByLabel('1번 이미지 설명 (alt)', { exact: true }).fill('첫 사진');
  await expect(page.locator('.image-alt-field:visible')).toHaveCSS('padding', '16px');
  await expect(page.locator('.image-alt-field:visible')).toHaveCSS(
    'border-top-color',
    'rgb(74, 144, 217)',
  );
  await page.getByRole('button', { name: '다음 이미지', exact: true }).click();
  await pictures.nth(1).click();
  await expect(page.getByLabel('1번 이미지 설명 (alt)', { exact: true })).toBeHidden();
  await page.getByLabel('2번 이미지 설명 (alt)', { exact: true }).fill('둘째 사진');
  const entries = JSON.parse((await page.getByTestId('saved-alts').textContent())!);
  expect(entries.map((entry: { alt: string }) => entry.alt)).toEqual(['첫 사진', '둘째 사진']);
});

test('드로어 입력 중 자동 임시저장되고 수동 저장 후 다시 불러온다', async ({ page }) => {
  let saved: Record<string, unknown> = {};
  await page.route('**/api/drafts**', async (route) => {
    if (route.request().method() === 'POST')
      saved = { ...route.request().postDataJSON(), id: 'test-draft' };
    await route.fulfill({ json: { draft: saved } });
  });
  await page.clock.install();
  await page.reload();
  await upload(page);
  await page.getByRole('button', { name: '이미지 alt 입력', exact: true }).click();
  const drawer = page.getByRole('dialog');
  await drawer.getByLabel('이미지 1 설명 (alt)').fill('열린 드로어 설명');
  await drawer.getByLabel('썸네일 이미지 설명 (alt)').fill('썸네일 저장');
  await page.clock.fastForward(120000);
  await expect
    .poll(() => saved.image_alts)
    .toEqual([expect.objectContaining({ alt: '열린 드로어 설명' })]);
  await drawer.getByRole('button', { name: '완료', exact: true }).click();
  await page.locator('.tiptap img').first().click();
  await page.getByLabel('이미지 설명 (alt)', { exact: true }).fill('수동 저장 설명');
  await page.getByRole('button', { name: '임시저장', exact: true }).click();
  await expect
    .poll(() => saved.image_alts)
    .toEqual([expect.objectContaining({ alt: '수동 저장 설명' })]);
  expect((saved.form_data as { content: string }).content).toContain('<img');
  await page.reload();
  await expect(page.locator('.tiptap')).toBeVisible();
  await page.getByRole('button', { name: '임시저장 불러오기', exact: true }).click();
  await expect(page.getByTestId('saved-html')).toContainText('<img');
  await page.locator('.tiptap img').first().click();
  await expect(page.getByLabel('이미지 설명 (alt)', { exact: true })).toHaveValue('수동 저장 설명');
  await expect(page.getByLabel('썸네일 이미지 설명 (alt)', { exact: true })).toHaveValue(
    '썸네일 저장',
  );
});
