import type { Page } from '@playwright/test';

export const USERS = {
  owner: 'owner@demo.test',
  ptA: 'pt.a@demo.test',
  ptB: 'pt.b@demo.test',
} as const;

export async function loginAs(page: Page, who: keyof typeof USERS) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(USERS[who]);
  await page.getByPlaceholder('Mật khẩu').fill('demo12345');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('**/today');
}
