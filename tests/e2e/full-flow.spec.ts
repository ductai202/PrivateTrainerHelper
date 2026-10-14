import { test, expect } from '@playwright/test';
import { adminDb, loginAs, resetRecentSessions, vnToday } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });
test.setTimeout(90000);

const NAME = `Flow ${Date.now()}`;

function vnDatePlus(days: number): string {
  const d = new Date(`${vnToday()}T12:00:00+07:00`);
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
}

test('PT day-to-day flow and owner overview', async ({ page, context }) => {
  await resetRecentSessions();
  await context.route('https://zalo.me/**', (r) => r.fulfill({ body: 'ok', contentType: 'text/html' }));
  await loginAs(page, 'ptA');

  // 1. create a student with a 5-session package, free every day
  await page.goto('/students/new');
  await page.getByLabel('Họ tên').fill(NAME);
  await page.getByLabel('Số điện thoại').fill('0933 111 222');
  await page.getByLabel('Số buổi trong gói').fill('5');
  for (const d of ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']) {
    await page.getByLabel(d, { exact: true }).check();
  }
  await page.getByLabel('Rảnh từ').fill('06:00');
  await page.getByLabel('Rảnh đến').fill('21:00');
  await page.getByRole('button', { name: 'Lưu học viên' }).click();
  await expect(page).toHaveURL(/[0-9a-f-]{36}/, { timeout: 20000 });
  await expect(page.getByRole('heading', { name: NAME })).toBeVisible();

  // 2. book tomorrow 10:00 and remind
  const tomorrow = vnDatePlus(1);
  await page.goto('/sessions/new');
  await page.getByLabel('Học viên').selectOption({ label: NAME });
  await page.getByLabel('Ngày').fill(tomorrow);
  await page.getByLabel('Giờ bắt đầu').fill('10:00');
  await page.getByRole('button', { name: 'Tạo buổi' }).click();
  await expect(page).toHaveURL(/(today|week)/);

  await page.goto('/reminders');
  const row = page.getByTestId('reminder-row').filter({ hasText: NAME });
  await row.getByRole('link', { name: 'Nhắc qua Zalo' }).click();
  await expect(row.getByText('Đã nhắc')).toBeVisible();

  // 3. complete the session: done + signed + workout
  const { data: s1 } = await adminDb()
    .from('sessions')
    .select('id, students!inner(full_name)')
    .eq('students.full_name', NAME)
    .single();
  await page.goto(`/sessions/${s1!.id}`);
  await page.getByRole('button', { name: 'Hoàn thành' }).click();
  await expect(page.getByTestId('status')).toHaveText('Đã hoàn thành');
  await page.getByRole('button', { name: 'Đã ký' }).click();
  await expect(page.getByTestId('signed')).toHaveText('Đã ký');
  await page.getByRole('button', { name: 'Không cần bài tập' }).click();
  await expect(page.getByText('Đã ghi bài tập')).toBeVisible();

  await page.goto('/students');
  await expect(page.getByRole('link', { name: new RegExp(NAME) })).toContainText('Còn 4 buổi');

  // 4. second session in two days, cancelled -> fill-in suggestions
  await page.goto('/sessions/new');
  await page.getByLabel('Học viên').selectOption({ label: 'Học viên A1' });
  await page.getByLabel('Ngày').fill(vnDatePlus(2));
  await page.getByLabel('Giờ bắt đầu').fill('10:00');
  await page.getByRole('button', { name: 'Tạo buổi' }).click();
  await expect(page).toHaveURL(/(today|week)/);
  const { data: s2 } = await adminDb()
    .from('sessions')
    .select('id, students!inner(full_name)')
    .eq('students.full_name', 'Học viên A1')
    .gte('start_at', new Date(`${vnDatePlus(2)}T00:00:00+07:00`).toISOString())
    .single();
  await page.goto(`/sessions/${s2!.id}`);
  await page.getByLabel('Lý do huỷ').fill('Bận');
  await page.getByRole('button', { name: 'Huỷ buổi' }).click();
  await expect(page.getByTestId('status')).toHaveText('Đã huỷ');
  await expect(page.getByRole('link', { name: 'Mời qua Zalo' }).first()).toBeVisible();

  // 5. owner sees it in the month report
  const month = tomorrow.slice(0, 7);
  await page.context().clearCookies();
  await loginAs(page, 'owner');
  await page.goto(`/owner?m=${month}`);
  const a = page.getByRole('row', { name: /PT An/ });
  await expect(a.getByTestId('cancelled')).not.toHaveText('0');
  await expect(a.getByTestId('done')).not.toHaveText('0');
});
