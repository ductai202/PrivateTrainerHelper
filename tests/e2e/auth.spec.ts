import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

test('unauthenticated /today redirects to login', async ({ page }) => {
  await page.goto('/today');
  await expect(page).toHaveURL(/\/login/);
});

test('wrong password shows error', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('pt.a@demo.test');
  await page.getByPlaceholder('Mật khẩu').fill('wrong');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByText('Email hoặc mật khẩu không đúng')).toBeVisible();
});

test('PT A logs in, sees nav and settings with logout', async ({ page }) => {
  await loginAs(page, 'ptA');
  for (const label of ['Hôm nay', 'Tuần', 'Học viên', 'Cài đặt']) {
    await expect(page.getByRole('navigation').getByRole('link', { name: label })).toBeVisible();
  }
  await page.goto('/settings');
  await expect(page.getByText('Thêm vào màn hình chính')).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login/);
});
