import { test, expect } from '@playwright/test';
import { adminDb, loginAs, resetRecentSessions, vnToday } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const PT_B = 'bbbbbbbb-0000-0000-0000-000000000003';
const A1 = 'cccccccc-0000-0000-0000-000000000001';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function vnDatePlus(days: number): string {
  const d = new Date(`${vnToday()}T12:00:00+07:00`);
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
}

test('progress photo is shown, even when submitted without a note', async ({ page }) => {
  await loginAs(page, 'ptA');
  await page.goto('/students/' + A1 + '?tab=progress');
  await page.getByLabel('Ảnh (tuỳ chọn)').setInputFiles({
    name: 'p.png',
    mimeType: 'image/png',
    buffer: PNG_1X1,
  });
  await page.getByRole('button', { name: 'Cập nhật tình trạng' }).click();
  const img = page.getByTestId('progress-photo').first();
  await expect(img).toBeVisible();
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
    .toBe(true);
});

test('push subscription moves to the new member when a device changes hands', async ({
  page,
  browser,
}) => {
  const endpoint = `https://push.example.test/${Date.now()}`;
  const body = { endpoint, keys: { p256dh: 'p256', auth: 'auth' } };

  await loginAs(page, 'ptA');
  expect((await page.request.post('/api/push/subscribe', { data: body })).status()).toBe(200);

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await loginAs(pageB, 'ptB');
  expect((await pageB.request.post('/api/push/subscribe', { data: body })).status()).toBe(200);
  await ctxB.close();

  const { data } = await adminDb()
    .from('push_subscriptions')
    .select('member_id')
    .eq('endpoint', endpoint);
  expect(data).toEqual([{ member_id: PT_B }]);
});

test('a session running past midnight blocks a booking that starts on the next day', async ({
  page,
}) => {
  await resetRecentSessions();
  const day = vnDatePlus(2);
  const next = vnDatePlus(3);
  const start = new Date(`${day}T23:30:00+07:00`);
  await adminDb().from('sessions').insert({
    gym_id: GYM,
    pt_id: PT_A,
    student_id: A1,
    start_at: start.toISOString(),
    end_at: new Date(start.getTime() + 3600_000).toISOString(),
  });

  await loginAs(page, 'ptA');
  await page.goto('/sessions/new');
  await page.getByLabel('Học viên').selectOption({ label: 'Học viên A2' });
  await page.getByLabel('Ngày').fill(next);
  await page.getByLabel('Giờ bắt đầu').fill('00:00');
  await page.getByRole('button', { name: 'Tạo buổi' }).click();
  await expect(page.getByText(/Trùng lịch với Học viên A1/)).toBeVisible();
});
