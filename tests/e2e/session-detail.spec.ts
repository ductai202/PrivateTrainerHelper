import { test, expect } from '@playwright/test';
import { adminDb, loginAs, resetRecentSessions, vnToday } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const A1 = 'cccccccc-0000-0000-0000-000000000001';
const PKG_A1 = 'dddddddd-0000-0000-0000-000000000001';

test.beforeEach(async () => {
  await resetRecentSessions();
});

/** 10:00 VN time, two days from now: inside every seeded availability window whatever time the suite runs. */
function tenOclockInTwoDays(): Date {
  const d = new Date(`${vnToday()}T12:00:00+07:00`);
  d.setDate(d.getDate() + 2);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
  return new Date(`${day}T10:00:00+07:00`);
}

async function insertSession(startOffsetH: number | Date, durationH = 1) {
  const start =
    startOffsetH instanceof Date ? startOffsetH : new Date(Date.now() + startOffsetH * 3600 * 1000);
  const { data, error } = await adminDb()
    .from('sessions')
    .insert({
      gym_id: GYM,
      pt_id: PT_A,
      student_id: A1,
      package_id: PKG_A1,
      start_at: start.toISOString(),
      end_at: new Date(start.getTime() + durationH * 3600 * 1000).toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

async function remainingFor(page: import('@playwright/test').Page, name: string) {
  await page.goto('/students');
  const text = await page.getByRole('link', { name: new RegExp(name) }).innerText();
  return Number(/Còn (-?\d+) buổi/.exec(text)![1]);
}

test('checklist: done + signed consumes the package, unsigning restores it', async ({ page }) => {
  const id = await insertSession(-3);
  await loginAs(page, 'ptA');
  const before = await remainingFor(page, 'Học viên A1');

  await page.goto(`/sessions/${id}`);
  await expect(page.getByText('Kết quả buổi')).toBeVisible();
  await expect(page.getByText('Học viên đã ký')).toBeVisible();
  await expect(page.getByText('Bài tập hôm nay')).toBeVisible();

  await page.getByRole('button', { name: 'Hoàn thành' }).click();
  await expect(page.getByTestId('status')).toHaveText('Đã hoàn thành');
  // done but unsigned: package unchanged
  expect(await remainingFor(page, 'Học viên A1')).toBe(before);

  await page.goto(`/sessions/${id}`);
  await page.getByRole('button', { name: 'Đã ký' }).click();
  await expect(page.getByTestId('signed')).toHaveText('Đã ký');
  await page.getByLabel('Nội dung bài tập').fill('Squat 4x10, plank 3x45s');
  await page.getByRole('button', { name: 'Lưu bài tập' }).click();
  await expect(page.getByText('Đã ghi bài tập')).toBeVisible();

  await page.goto('/today');
  await expect(page.getByTestId('session-card').getByText('Chưa xong')).toHaveCount(0);
  expect(await remainingFor(page, 'Học viên A1')).toBe(before - 1);

  await page.goto(`/sessions/${id}`);
  await page.getByRole('button', { name: 'Bỏ ký' }).click();
  await expect(page.getByTestId('signed')).toHaveText('Chưa ký');
  expect(await remainingFor(page, 'Học viên A1')).toBe(before);
});

test('cancel suggests fill-ins that can be invited and booked', async ({ page }) => {
  const id = await insertSession(tenOclockInTwoDays());
  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${id}`);
  await page.getByLabel('Lý do huỷ').fill('Bận đột xuất');
  await page.getByRole('button', { name: 'Huỷ buổi' }).click();
  await expect(page.getByTestId('status')).toHaveText('Đã huỷ');

  await expect(page.getByRole('heading', { name: 'Gợi ý lấp slot' })).toBeVisible();
  const invite = page.getByRole('link', { name: 'Mời qua Zalo' }).first();
  await expect(invite).toHaveAttribute('href', /^https:\/\/zalo\.me\/0/);

  await page.getByRole('link', { name: 'Đặt buổi cho học viên này' }).first().click();
  await expect(page).toHaveURL(/sessions\/new\?student=/);
  await page.getByRole('button', { name: 'Tạo buổi' }).click();
  await expect(page).toHaveURL(/(today|week)/);
});

test('no fill-in candidate message', async ({ page }) => {
  // 03:00 VN tomorrow-ish is outside every seeded availability window (06:00-21:00)
  const tomorrow = new Date(`${vnToday()}T03:00:00+07:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const { data } = await adminDb()
    .from('sessions')
    .insert({
      gym_id: GYM, pt_id: PT_A, student_id: A1, package_id: PKG_A1,
      start_at: tomorrow.toISOString(),
      end_at: new Date(tomorrow.getTime() + 3600_000).toISOString(),
      status: 'cancelled',
    })
    .select('id')
    .single();
  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${data!.id}`);
  await expect(page.getByText('Không có học viên phù hợp khung giờ này')).toBeVisible();
});
