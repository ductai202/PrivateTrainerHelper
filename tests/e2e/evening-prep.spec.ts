import { test, expect } from '@playwright/test';
import { adminDb, loginAs, resetRecentSessions } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const A1 = 'cccccccc-0000-0000-0000-000000000001';
const A2 = 'cccccccc-0000-0000-0000-000000000002';
const PKG_A1 = 'dddddddd-0000-0000-0000-000000000001';

test.beforeEach(async () => {
  await resetRecentSessions();
  const db = adminDb();
  // only the two seeded students take part, so the ranking is deterministic
  await db
    .from('students')
    .update({ archived: true })
    .eq('pt_id', PT_A)
    .not('id', 'in', `(${A1},${A2})`);
  await db.from('students').update({ target_per_week: 2, archived: false }).in('id', [A1, A2]);
});

test('evening prep lists unfinished sessions, suggestions, and books a suggestion', async ({ page }) => {
  // a session that ended 3 hours ago and was never closed
  const start = new Date(Date.now() - 4 * 3600_000);
  await adminDb().from('sessions').insert({
    gym_id: GYM,
    pt_id: PT_A,
    student_id: A1,
    package_id: PKG_A1,
    start_at: start.toISOString(),
    end_at: new Date(start.getTime() + 3600_000).toISOString(),
  });

  await loginAs(page, 'ptA');
  await page.goto('/reminders');

  await expect(page.getByRole('heading', { name: 'Buổi chưa cập nhật' })).toBeVisible();
  await expect(page.getByTestId('unfinished-row').filter({ hasText: 'Học viên A1' })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Gợi ý xếp lịch' })).toBeVisible();
  const sug = page.getByTestId('suggestion-row').filter({ hasText: 'Học viên A2' });
  await expect(sug).toBeVisible();
  await expect(sug).toContainText('Tuần này 0/2 buổi');
  await expect(sug).toContainText('chưa tập lần nào');

  await sug.getByRole('button', { name: 'Đặt buổi' }).click();
  await expect(page.getByTestId('suggestion-row').filter({ hasText: 'Học viên A2' })).toHaveCount(0);
  await expect(page.getByTestId('reminder-row').filter({ hasText: 'Học viên A2' })).toBeVisible();

  const { data } = await adminDb()
    .from('sessions')
    .select('id, status')
    .eq('student_id', A2)
    .gte('start_at', new Date().toISOString());
  expect(data).toHaveLength(1);
  expect(data![0].status).toBe('scheduled');
});

test('a student who reached the weekly target is not suggested', async ({ page }) => {
  await adminDb().from('students').update({ target_per_week: 1 }).eq('id', A2);
  // one done session earlier this week counts towards the target, even if it was today
  const start = new Date(Date.now() - 2 * 3600_000);
  await adminDb().from('sessions').insert({
    gym_id: GYM,
    pt_id: PT_A,
    student_id: A2,
    start_at: start.toISOString(),
    end_at: new Date(start.getTime() + 3600_000).toISOString(),
    status: 'done',
    student_signed: true,
    workout_logged: true,
  });
  await loginAs(page, 'ptA');
  await page.goto('/reminders');
  await expect(page.getByRole('heading', { name: 'Gợi ý xếp lịch' })).toBeVisible();
  await expect(page.getByTestId('suggestion-row').filter({ hasText: 'Học viên A2' })).toHaveCount(0);
});

test('a PT sets the evening review time and it is saved', async ({ page }) => {
  await loginAs(page, 'ptA');
  await page.goto('/settings');
  await page.getByLabel('Giờ nhắc buổi tối').fill('19:30');
  await page.getByRole('button', { name: 'Lưu giờ nhắc' }).click();
  await expect(page.getByText('Đã lưu giờ nhắc')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Giờ nhắc buổi tối')).toHaveValue('19:30');
  const { data } = await adminDb().from('members').select('evening_review_time').eq('id', PT_A).single();
  expect(data!.evening_review_time.slice(0, 5)).toBe('19:30');

  // restore the default for other tests
  await adminDb().from('members').update({ evening_review_time: '20:00' }).eq('id', PT_A);
});

test('weekly target is captured on creation and shown on the profile', async ({ page }) => {
  await loginAs(page, 'ptA');
  await page.goto('/students/new');
  const name = `Target ${Date.now()}`;
  await page.getByLabel('Họ tên').fill(name);
  await page.getByLabel('Số điện thoại').fill('0944 555 666');
  await page.getByLabel('Số buổi mong muốn mỗi tuần').fill('4');
  await page.getByRole('button', { name: 'Lưu học viên' }).click();
  await expect(page).toHaveURL(/[0-9a-f-]{36}/);
  await expect(page.getByText('Mục tiêu mỗi tuần: 4 buổi')).toBeVisible();
});
