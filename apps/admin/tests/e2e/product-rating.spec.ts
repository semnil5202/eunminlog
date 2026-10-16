import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await page.goto('/?rating');
  await expect(page.getByLabel('은민 평점', { exact: false })).toBeVisible();
});

test('평점 입력·다제품 초기화·제품명 삭제·폼 전환을 처리한다', async ({ page }) => {
  const rating = page.getByLabel('은민 평점', { exact: false });
  await expect(rating).toHaveValue('');
  await page.getByRole('button', { name: '저장 검증' }).click();
  await expect(page.getByTestId('rating-saved')).toHaveText('{"rating":null}');
  await rating.fill('3.8');
  await page.getByRole('button', { name: '저장 검증' }).click();
  await expect(page.getByTestId('rating-saved')).toHaveText('{"rating":3.8}');
  await page.getByRole('button', { name: '+ 제품 추가', exact: true }).click();
  await page.getByPlaceholder('제품명을 입력해주세요.').nth(1).fill('커피');
  await expect(rating).toHaveCount(0);
  await expect(page.getByTestId('rating-values')).toContainText('"rating":null');
  await page.getByRole('button', { name: '제품 2 삭제' }).click();
  await expect(rating).toHaveValue('');
  await rating.fill('4.2');
  await page.getByPlaceholder('제품명을 입력해주세요.').fill(' ');
  await expect(rating).toHaveCount(0);
  await expect(page.getByTestId('rating-values')).toContainText('"rating":null');
  await page.getByPlaceholder('제품명을 입력해주세요.').fill('음료');
  await rating.fill('4.5');
  await page.getByLabel('폼 형식').selectOption('visit');
  await expect(rating).toHaveCount(0);
  await expect(page.getByTestId('rating-values')).toContainText('"rating":null');
  await page.getByLabel('폼 형식').selectOption('product-review');
  await page.getByPlaceholder('제품명을 입력해주세요.').fill('음료');
  await expect(rating).toHaveValue('');
});

test('임시저장 평점 복원과 이전 초안 호환·범위 검증을 처리한다', async ({ page }) => {
  const rating = page.getByLabel('은민 평점', { exact: false });
  await rating.fill('3.8');
  await page.getByRole('button', { name: '임시저장', exact: true }).click();
  await rating.fill('4.5');
  await page.getByRole('button', { name: '임시저장 복원', exact: true }).click();
  await expect(rating).toHaveValue('3.8');
  await rating.fill('3.81');
  await page.getByRole('button', { name: '저장 검증' }).click();
  await expect(page.getByText('평점은 1~5 사이에서 소수 한 자리까지 입력해주세요.')).toBeVisible();
  await expect(page.getByTestId('rating-saved')).toHaveText('');
  await rating.fill('6');
  await page.getByRole('button', { name: '저장 검증' }).click();
  await expect(page.getByText('평점은 1~5 사이에서 소수 한 자리까지 입력해주세요.')).toBeVisible();
  await page.getByRole('button', { name: '이전 초안 복원', exact: true }).click();
  await expect(rating).toHaveValue('');
});
