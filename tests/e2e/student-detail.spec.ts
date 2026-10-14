import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

const A1 = 'cccccccc-0000-0000-0000-000000000001';

test('profile, progress, nutrition and workouts tabs', async ({ page }) => {
  await loginAs(page, 'ptA');
  await page.goto(`/students/${A1}`);
  await expect(page.getByRole('heading', { name: 'Học viên A1' })).toBeVisible();
  await expect(page.getByText(`Tuổi: ${new Date().getFullYear() - 1995}`)).toBeVisible();
  await expect(page.getByText('Còn 11 buổi')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mở Zalo' })).toHaveAttribute(
    'href',
    'https://zalo.me/0900000001',
  );

  // progress
  await page.getByRole('link', { name: 'Tiến độ' }).click();
  await expect(page.getByLabel('Cân nặng (kg)')).toBeVisible();
  const rows = page.getByTestId('measurement-row');
  const before = await rows.count();
  await page.getByLabel('Cân nặng (kg)').fill('54');
  await page.getByLabel('Vòng eo (cm)').fill('66');
  await page.getByLabel('Nhận xét').fill('Tiến bộ tốt');
  await page.getByRole('button', { name: 'Cập nhật tình trạng' }).click();
  await expect(rows).toHaveCount(before + 1);
  await expect(page.getByTestId('measurement-chart').locator('svg').first()).toBeVisible();

  // nutrition
  await page.getByRole('link', { name: 'Dinh dưỡng' }).click();
  await page.getByLabel('Thực đơn mới').fill('Sáng: trứng, bánh mì đen');
  await page.getByRole('button', { name: 'Lưu thực đơn' }).click();
  await expect(page.getByTestId('current-meal')).toContainText('Sáng: trứng, bánh mì đen');

  // workouts
  await page.getByRole('link', { name: 'Bài tập' }).click();
  await expect(page.getByRole('heading', { name: 'Bài tập đã ghi' })).toBeVisible();
});
