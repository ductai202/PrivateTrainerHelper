import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

const NAME = `Nguyễn Lan ${Date.now()}`;

test('PT A creates a student with full profile, PT B cannot see it', async ({ page, browser }) => {
  await loginAs(page, 'ptA');
  await page.goto('/students/new');

  // validation
  await page.getByRole('button', { name: 'Lưu học viên' }).click();
  await expect(page.getByText('Vui lòng nhập tên')).toBeVisible();
  await page.getByLabel('Họ tên').fill(NAME);
  await page.getByLabel('Số điện thoại').fill('123');
  await page.getByRole('button', { name: 'Lưu học viên' }).click();
  await expect(page.getByText('Số điện thoại không hợp lệ')).toBeVisible();

  await page.getByLabel('Số điện thoại').fill('0912 345 678');
  await page.getByLabel('Năm sinh').fill('1998');
  await page.getByLabel('Giới tính').selectOption('female');
  await page.getByLabel('Chiều cao (cm)').fill('160');
  await page.getByLabel('Cân nặng (kg)').fill('55');
  await page.getByLabel('Vòng eo (cm)').fill('68');
  await page.getByLabel('Mục tiêu').fill('Giảm mỡ');
  await page.getByLabel('Meal prep hiện tại').fill('Sáng: yến mạch');
  await page.getByLabel('Số buổi trong gói').fill('12');
  await page.getByLabel('Thứ 3').check();
  await page.getByLabel('Rảnh từ').fill('17:00');
  await page.getByLabel('Rảnh đến').fill('19:00');
  await page.getByRole('button', { name: 'Lưu học viên' }).click();

  await expect(page).toHaveURL(/\/students\/[0-9a-f-]{36}/);
  const detailUrl = page.url();
  await expect(page.getByRole('heading', { name: NAME })).toBeVisible();

  await page.goto('/students');
  const row = page.getByRole('link', { name: new RegExp(NAME) });
  await expect(row).toBeVisible();
  await expect(row).toContainText('Còn 12 buổi');

  // PT B must not see it, nor open it
  const ctxB = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const pageB = await ctxB.newPage();
  await loginAs(pageB, 'ptB');
  await pageB.goto('/students');
  await expect(pageB.getByText(NAME)).toHaveCount(0);
  await pageB.goto(detailUrl);
  await expect(pageB.getByText('Không tìm thấy học viên')).toBeVisible();
  await ctxB.close();
});
