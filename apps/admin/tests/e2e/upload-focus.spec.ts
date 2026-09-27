import { expect, test } from '@playwright/test';
import type { Editor } from '@tiptap/core';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'HTML 소스 모드' }).click();
  await page
    .locator('textarea')
    .fill(Array.from({ length: 90 }, (_, index) => `<p>문단 ${index}</p>`).join(''));
  await page.getByRole('button', { name: 'HTML 소스 모드' }).click();
});

test('툴바 업로드 완료는 상단 스크롤을 유지하고 에디터를 재생성하거나 본문 전체를 교체하지 않는다', async ({
  page,
}) => {
  await page.locator('.tiptap p').last().click();
  await page.evaluate(() => window.scrollTo(0, 0));
  const original = await page.locator('.tiptap').evaluateHandle((dom) => {
    const editor = (dom as HTMLElement & { editor: Editor }).editor;
    const record = { dom, editor, destroyed: false, replaced: false };
    editor.on('destroy', () => {
      record.destroyed = true;
    });
    editor.on('transaction', ({ transaction }) => {
      if (
        transaction.steps.some((step, index) => {
          const json = step.toJSON();
          return (
            json.stepType === 'replace' &&
            json.from === 0 &&
            json.to === transaction.docs[index].content.size
          );
        })
      )
        record.replaced = true;
    });
    return record;
  });
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '이미지 추가', exact: true }).click();
  await (
    await chooser
  ).setFiles({ name: 'very-slow-scroll.png', mimeType: 'image/png', buffer: Buffer.from('image') });
  await expect(page.getByText('이미지 업로드 중...', { exact: true })).toBeVisible();
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeLessThan(200);
  await expect(page.locator('.tiptap img:not(.ProseMirror-separator)')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(200);
  expect(
    await original.evaluate((record) => ({
      sameDOM: record.dom === document.querySelector('.tiptap'),
      sameEditor:
        record.editor ===
        (document.querySelector('.tiptap') as HTMLElement & { editor: Editor }).editor,
      destroyed: record.destroyed,
      replaced: record.replaced,
    })),
  ).toEqual({ sameDOM: true, sameEditor: true, destroyed: false, replaced: false });
  await original.dispose();
});

test('캐러셀 생성 모달 종료 후 본문에 이어서 입력할 수 있다', async ({ page }) => {
  await page.locator('.tiptap p').first().click();
  await page.getByRole('button', { name: '캐러셀 만들기' }).click();
  await page
    .getByLabel('이미지 파일 선택')
    .setInputFiles(
      ['one.png', 'two.png'].map((name) => ({
        name,
        mimeType: 'image/png',
        buffer: Buffer.from('image'),
      })),
    );
  await page.getByRole('button', { name: '생성', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.tiptap')).toBeFocused();
  await page.keyboard.type('계속입력');
  await expect(page.locator('.tiptap')).toContainText('계속입력');
});

for (const kind of ['paste', 'drop'] as const) {
  test(`${kind} 업로드 중 다른 문단으로 이동하면 커서와 보고 있던 문단을 유지한다`, async ({
    page,
  }) => {
    await page.locator('.tiptap p').first().click();
    await page.locator('.tiptap').evaluate((dom, kind) => {
      const data = new DataTransfer();
      data.items.add(new File(['image'], 'very-slow-position.png', { type: 'image/png' }));
      const rect = dom.querySelector('p')!.getBoundingClientRect();
      dom.dispatchEvent(
        kind === 'paste'
          ? new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data })
          : new DragEvent('drop', {
              bubbles: true,
              cancelable: true,
              dataTransfer: data,
              clientX: rect.x + 5,
              clientY: rect.y + 5,
            }),
      );
    }, kind);
    const paragraph = page.getByText('문단 45', { exact: true });
    await paragraph.click();
    const before = (await paragraph.boundingBox())!.y;
    await expect(page.locator('.tiptap img:not(.ProseMirror-separator)')).toHaveCount(1);
    await expect
      .poll(async () => Math.abs((await paragraph.boundingBox())!.y - before))
      .toBeLessThan(3);
    await expect(page.locator('.tiptap')).toBeFocused();
    const selected = await page.evaluate(() => window.getSelection()?.anchorNode?.textContent);
    expect(selected).toBe('문단 45');
    await page.keyboard.type('이어서');
    await expect(page.locator('.tiptap p').filter({ hasText: '이어서' })).toContainText('45');
  });
}
