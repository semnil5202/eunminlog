import { expect, test, type Page } from '@playwright/test';

type TransferFile = { name: string; type?: string; size?: number };
async function transfer(
  page: Page,
  kind: 'paste' | 'drop' | 'dragover',
  files: TransferFile[],
  text = '',
) {
  return page.evaluate(
    ({ kind, files, text }) => {
      const editor = document.querySelector('.tiptap')!;
      const data = new DataTransfer();
      files.forEach(({ name, type = 'image/png', size = 8 }) => {
        data.items.add(new File([new Uint8Array(size)], name, { type }));
      });
      if (text) {
        data.setData('text/plain', text);
        data.setData(
          'text/html',
          `<p>${text}</p><img src="https://example.invalid/duplicate.png">`,
        );
      }
      const rect = editor.querySelector('p')!.getBoundingClientRect();
      const event =
        kind === 'paste'
          ? new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data })
          : new DragEvent(kind, {
              bubbles: true,
              cancelable: true,
              dataTransfer: data,
              clientX: rect.left + 5,
              clientY: rect.top + 5,
            });
      editor.dispatchEvent(event);
      return event.defaultPrevented;
    },
    { kind, files, text },
  );
}
const calls = (page: Page) =>
  page.evaluate(() => (window as unknown as { uploadCalls: string[] }).uploadCalls);
const images = (page: Page) => page.locator('.tiptap img:not(.ProseMirror-separator)');
const errors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const caught: string[] = [];
  errors.set(page, caught);
  page.on('pageerror', (error) => caught.push(error.message));
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') await route.continue();
    else {
      caught.push(`테스트 범위 밖 요청: ${route.request().url()}`);
      await route.abort();
    }
  });
  await page.goto('/');
  await expect(page.locator('.tiptap')).toBeVisible();
  await page.locator('.tiptap').click();
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

test('파일당 50MB까지 허용하고 여러 파일 합계에는 제한을 두지 않는다', async ({ page }) => {
  await transfer(page, 'drop', [
    { name: 'limit.png', size: 50 * 1024 * 1024 },
    { name: 'extra.png', size: 1 * 1024 * 1024 },
  ]);
  await expect(images(page)).toHaveCount(2);
  expect(await calls(page)).toEqual(['limit.png', 'extra.png']);
});

test('파일 붙여넣기는 즉시 독립 이미지를 순서대로 삽입하고 단일 Undo로 되돌린다', async ({
  page,
}) => {
  const before = await page.getByTestId('saved-html').textContent();
  expect(
    await transfer(
      page,
      'paste',
      [{ name: 'slow-first.png' }, { name: 'second.png' }],
      '파일 우선',
    ),
  ).toBe(true);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(images(page)).toHaveCount(2);
  expect(await calls(page)).toEqual(['slow-first.png', 'second.png']);
  const sources = await images(page).evaluateAll((nodes) =>
    nodes.map((node) => decodeURIComponent((node as HTMLImageElement).src)),
  );
  expect(sources[0]).toContain('slow-first.png');
  expect(sources[1]).toContain('second.png');
  await expect(page.locator('.image-carousel-container')).toHaveCount(0);
  expect(await page.getByTestId('saved-html').textContent()).not.toContain('파일 우선');
  await page.locator('.tiptap').press('ControlOrMeta+z');
  expect(await page.getByTestId('saved-html').textContent()).toBe(before);
});

test('드롭 안내와 놓은 위치를 사용하고 업로드 도중 텍스트 수정을 추적한다', async ({ page }) => {
  await page.locator('.tiptap').press('ControlOrMeta+End');
  await page.locator('.tiptap').press('Enter');
  await page.locator('.tiptap').pressSequentially('마지막 문단');
  expect(await transfer(page, 'dragover', [{ name: 'slow-drop.png' }])).toBe(true);
  await expect(page.getByText('여기에 이미지를 놓으세요')).toBeVisible();
  expect(await transfer(page, 'drop', [{ name: 'slow-drop.png' }])).toBe(true);
  await expect(page.getByText('여기에 이미지를 놓으세요')).toHaveCount(0);
  await page.locator('.tiptap').press('ControlOrMeta+End');
  await page.locator('.tiptap').pressSequentially(' 수정');
  await expect(images(page)).toHaveCount(1);
  const html = (await page.getByTestId('saved-html').textContent())!;
  expect(html.indexOf('<img')).toBeLessThan(html.indexOf('마지막 문단'));
  expect(html).toContain('마지막 문단 수정');
});

test('일반 업로드 실패는 세션을 비우고 이전 늦은 응답이 새 업로드에 섞이지 않는다', async ({
  page,
}) => {
  await transfer(page, 'paste', [
    { name: 'very-slow-ok.png' },
    { name: 'slow-fail.png' },
    { name: 'queued.png' },
  ]);
  await transfer(page, 'paste', [{ name: 'blocked.png' }]);
  await expect(
    page.getByText('진행 중인 이미지 작업을 완료하거나 취소한 뒤 다시 시도해주세요.'),
  ).toBeVisible();
  await expect(page.getByText('이미지 업로드에 실패했습니다.', { exact: true })).toBeVisible();
  await expect(images(page)).toHaveCount(0);
  await transfer(page, 'paste', [{ name: 'replacement.png' }]);
  await expect(images(page)).toHaveCount(1);
  await page.waitForTimeout(2100);
  await expect(images(page)).toHaveCount(1);
  expect(await calls(page)).toEqual(['very-slow-ok.png', 'slow-fail.png', 'replacement.png']);
});

test('비지원·빈 파일·50MB 초과는 업로드하지 않으며 즉시 새 파일을 받을 수 있다', async ({
  page,
}) => {
  await transfer(page, 'drop', [
    { name: 'bad.pdf', type: 'application/pdf' },
    { name: 'empty.png', size: 0 },
    { name: 'large.png', size: 50 * 1024 * 1024 + 1 },
  ]);
  const failure = page.locator('[data-sonner-toast][data-type="error"]');
  await expect(failure).toContainText('지원하지 않는');
  await expect(failure).toContainText('빈 파일');
  await expect(failure).toContainText('50MB');
  await expect(failure.getByRole('button', { name: '다시 시도' })).toHaveCount(0);
  expect(await calls(page)).toEqual([]);
  await expect(page.getByRole('button', { name: '이미지 추가', exact: true })).toBeEnabled();
  await transfer(page, 'paste', [{ name: 'very-slow-cancel.png' }]);
  await page.getByRole('button', { name: '업로드 취소', exact: true }).click();
  await page.waitForTimeout(2100);
  await expect(images(page)).toHaveCount(0);
});

test('일반 텍스트와 URL 붙여넣기, 본문 내부 드래그는 파일 업로드로 처리하지 않는다', async ({
  page,
}) => {
  await page.evaluate(() => {
    const editor = document.querySelector('.tiptap')!;
    const data = new DataTransfer();
    data.setData('text/plain', '일반 텍스트');
    editor.dispatchEvent(
      new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }),
    );
  });
  await expect(page.locator('.tiptap')).toContainText('일반 텍스트');
  await page.evaluate(() => {
    const editor = document.querySelector('.tiptap')!;
    const data = new DataTransfer();
    data.setData('text/plain', 'https://example.com');
    editor.dispatchEvent(
      new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }),
    );
  });
  await expect(page.locator('.tiptap')).toContainText('https://example.com');
  await expect(page.getByRole('button', { name: '링크 유지', exact: true })).toBeVisible();
  await page.locator('.tiptap').dispatchEvent('dragstart');
  await transfer(page, 'dragover', [{ name: 'internal.png' }]);
  await expect(page.getByText('여기에 이미지를 놓으세요')).toHaveCount(0);
  await page.locator('.tiptap').dispatchEvent('dragend');
  expect(await calls(page)).toEqual([]);
});

test('HTML 모드에서는 파일 업로드를 시작하지 않는다', async ({ page }) => {
  await page.getByRole('button', { name: 'HTML 소스 모드' }).click();
  await page.locator('textarea').evaluate((textarea) => {
    const data = new DataTransfer();
    data.items.add(new File(['image'], 'source.png', { type: 'image/png' }));
    textarea.dispatchEvent(
      new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }),
    );
    const drop = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data });
    textarea.dispatchEvent(drop);
    if (!drop.defaultPrevented)
      throw new Error('HTML 모드에서 파일 드롭의 기본 탐색이 차단되지 않았습니다.');
  });
  expect(await calls(page)).toEqual([]);
});

test('본문 아래 빈 편집 공간에 파일을 놓으면 본문 끝에 삽입한다', async ({ page }) => {
  await page.locator('.tiptap').evaluate((editor) => {
    const wrapper = editor.parentElement!.parentElement!;
    const rect = wrapper.getBoundingClientRect();
    const data = new DataTransfer();
    data.items.add(new File(['image'], 'blank-drop.png', { type: 'image/png' }));
    wrapper.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
        clientX: rect.right - 20,
        clientY: rect.bottom - 20,
      }),
    );
  });
  await expect(images(page)).toHaveCount(1);
  const html = (await page.getByTestId('saved-html').textContent())!;
  expect(html.indexOf('<img')).toBeGreaterThan(html.indexOf('뒤 본문'));
});

test('드롭 안내는 영역 이탈과 드래그 종료 시 제거되고 내부 이미지는 재업로드하지 않는다', async ({
  page,
}) => {
  await transfer(page, 'dragover', [{ name: 'one.png' }]);
  await expect(page.getByText('여기에 이미지를 놓으세요')).toBeVisible();
  await page.locator('.tiptap').dispatchEvent('dragleave', { relatedTarget: null });
  await expect(page.getByText('여기에 이미지를 놓으세요')).toHaveCount(0);
  await transfer(page, 'dragover', [{ name: 'one.png' }]);
  await page.locator('.tiptap').dispatchEvent('dragend');
  await expect(page.getByText('여기에 이미지를 놓으세요')).toHaveCount(0);
  await transfer(page, 'paste', [{ name: 'one.png' }]);
  await expect(images(page)).toHaveCount(1);
  await page.locator('.tiptap').press('ControlOrMeta+End');
  await page.locator('.tiptap').press('Enter');
  await page.locator('.tiptap').pressSequentially('드롭 대상');
  await page.locator('.image-node-view').dragTo(page.locator('.tiptap p').last());
  await expect(images(page)).toHaveCount(1);
  expect(await calls(page)).toEqual(['one.png']);
  await expect(page.locator('.tiptap')).toContainText('드롭 대상');
});
