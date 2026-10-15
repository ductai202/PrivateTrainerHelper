import { test, expect } from '@playwright/test';
import { loginAs, resetRecentSessions, vnToday } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

test.beforeEach(async () => {
  await resetRecentSessions();
});

async function createSession(page: import('@playwright/test').Page, student: string, time: string) {
  await page.goto('/sessions/new');
  await page.getByLabel('Học viên').selectOption({ label: student });
  await page.getByLabel('Ngày').fill(vnToday());
  await page.getByLabel('Giờ bắt đầu').fill(time);
  await page.getByLabel('Thời lượng (phút)').fill('60');
  await page.getByRole('button', { name: 'Tạo buổi' }).click();
}

test('PT A creates sessions, conflicts blocked, back-to-back allowed', async ({ page }) => {
  await loginAs(page, 'ptA');
  await createSession(page, 'Học viên A1', '17:00');
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByText('Học viên A1')).toBeVisible();
  await expect(page.getByText('17:00')).toBeVisible();

  await createSession(page, 'Học viên A2', '17:30');
  await expect(page.getByText(/Trùng lịch với Học viên A1 lúc 17:00–18:00/)).toBeVisible();

  await createSession(page, 'Học viên A2', '18:00');
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByText('Học viên A2')).toBeVisible();

  await page.goto('/week');
  const a1 = page.getByRole('link', { name: /17:00–18:00.*Học viên A1/ });
  await expect(a1).toBeVisible();
  await page.getByRole('link', { name: 'Tuần trước' }).click();
  await expect(page).toHaveURL(/w=-1/);
  await expect(a1).toHaveCount(0);
});

test('owner sees all PTs and can filter', async ({ page }) => {
  await loginAs(page, 'ptA');
  await createSession(page, 'Học viên A1', '09:00');
  await expect(page).toHaveURL(/today/);
  await page.context().clearCookies();
  await loginAs(page, 'owner');
  const a1 = page.getByRole('link', { name: /09:00–10:00.*Học viên A1/ });
  await expect(a1).toBeVisible();
  await page.getByLabel('PT').selectOption({ label: 'PT Bình' });
  await page.getByRole('button', { name: 'Lọc' }).click();
  await expect(page).toHaveURL(/pt=/);
  await expect(a1).toHaveCount(0);
});
