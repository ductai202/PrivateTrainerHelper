import { test, expect } from '@playwright/test';
import { adminDb, loginAs, resetRecentSessions } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const A1 = 'cccccccc-0000-0000-0000-000000000001';

test('tomorrow reminders list, copy message and mark as reminded', async ({ page, context }) => {
  await resetRecentSessions();
  const tomorrowStart = new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(Date.now() + 24 * 3600 * 1000))}T10:00:00+07:00`);
  await adminDb().from('sessions').insert({
    gym_id: GYM,
    pt_id: PT_A,
    student_id: A1,
    start_at: tomorrowStart.toISOString(),
    end_at: new Date(tomorrowStart.getTime() + 3600_000).toISOString(),
  });
  await context.route('https://zalo.me/**', (r) => r.fulfill({ body: 'ok', contentType: 'text/html' }));

  await loginAs(page, 'ptA');
  await page.goto('/reminders');
  const row = page.getByTestId('reminder-row').filter({ hasText: 'Học viên A1' });
  await expect(row).toContainText('Chào Học viên A1, nhắc lịch tập với PT PT An lúc 10:00');
  await row.getByRole('link', { name: 'Nhắc qua Zalo' }).click();
  await expect(row.getByText('Đã nhắc')).toBeVisible();

  await page.reload();
  await expect(
    page.getByTestId('reminder-row').filter({ hasText: 'Học viên A1' }).getByText('Đã nhắc'),
  ).toBeVisible();
});

test('cron tick requires the secret', async ({ request }) => {
  const denied = await request.post('/api/cron/tick');
  expect(denied.status()).toBe(401);
  const ok = await request.post('/api/cron/tick', {
    headers: { authorization: 'Bearer local-cron-secret' },
  });
  expect(ok.status()).toBe(200);
  expect(typeof (await ok.json()).sent).toBe('number');
});
