import { test, expect, type Page } from '@playwright/test';
import { adminDb, loginAs, resetRecentSessions, vnToday } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const A1 = 'cccccccc-0000-0000-0000-000000000001';
const A2 = 'cccccccc-0000-0000-0000-000000000002';
const PKG_A1 = 'dddddddd-0000-0000-0000-000000000001';

test.beforeEach(async () => {
  await resetRecentSessions();
});

/** HH:mm in Vietnam time, as printed on a session card. */
function vnClock(hoursAhead: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(Date.now() + hoursAhead * 3600_000));
}

function vnDatePlus(days: number): string {
  const d = new Date(`${vnToday()}T12:00:00+07:00`);
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
}

async function insertSession(
  startOffsetH: number,
  extra: Record<string, unknown> = {},
  studentId = A1,
) {
  const start = new Date(Date.now() + startOffsetH * 3600_000);
  const { data, error } = await adminDb()
    .from('sessions')
    .insert({
      gym_id: GYM,
      pt_id: PT_A,
      student_id: studentId,
      package_id: studentId === A1 ? PKG_A1 : null,
      start_at: start.toISOString(),
      end_at: new Date(start.getTime() + 3600_000).toISOString(),
      ...extra,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

const row = async (id: string) =>
  (
    await adminDb()
      .from('sessions')
      .select('status, cancelled_by, cancelled_at, cancel_reason, rescheduled_from')
      .eq('id', id)
      .single()
  ).data!;

async function remainingFor(page: Page, name: string) {
  await page.goto('/students');
  const text = await page.getByRole('link', { name: new RegExp(name) }).innerText();
  return Number(/Còn (-?\d+) buổi/.exec(text)![1]);
}

test('one tap "HV bận" on the card cancels, shows fill-ins and keeps the package intact', async ({
  page,
}) => {
  const id = await insertSession(1);
  const clock = vnClock(1);
  await loginAs(page, 'ptA');
  const before = await remainingFor(page, 'Học viên A1');

  await page.goto('/week');
  const card = page.getByTestId('session-card').filter({ hasText: clock + '–' });
  await card.getByRole('button', { name: 'HV bận' }).click();

  await expect(page).toHaveURL(new RegExp(id));
  await expect(page.getByTestId('status')).toHaveText('Đã huỷ');
  await expect(page.getByRole('heading', { name: 'Gợi ý lấp slot' })).toBeVisible();

  const r = await row(id);
  expect(r.status).toBe('cancelled');
  expect(r.cancelled_by).toBe('student');
  expect(r.cancelled_at).not.toBeNull();
  expect(r.cancel_reason).toBe('Bận đột xuất');
  expect(await remainingFor(page, 'Học viên A1')).toBe(before);
});

test('"HV ốm" records the sick reason', async ({ page }) => {
  const id = await insertSession(2);
  const clock = vnClock(2);
  await loginAs(page, 'ptA');
  await page.goto('/week');
  await page
    .getByTestId('session-card')
    .filter({ hasText: clock + '–' })
    .getByRole('button', { name: 'HV ốm' })
    .click();
  await expect(page.getByTestId('status')).toHaveText('Đã huỷ');
  expect((await row(id)).cancel_reason).toBe('Ốm');
});

test('"Vẫn tập" confirms an upcoming session', async ({ page }) => {
  const id = await insertSession(1);
  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${id}`);
  await page.getByRole('button', { name: 'Vẫn tập' }).click();
  await expect(page.getByTestId('status')).toHaveText('Đã xác nhận');
  expect((await row(id)).status).toBe('confirmed');
});

test('reschedule cancels the old session and links the new one', async ({ page }) => {
  const id = await insertSession(30);
  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${id}?reschedule=1`);
  await page.getByLabel('Ngày mới').fill(vnDatePlus(3));
  await page.getByLabel('Giờ mới').fill('10:00');
  await page.getByRole('button', { name: 'Đổi giờ' }).click();

  await expect(page).not.toHaveURL(new RegExp(id));
  await expect(page.getByTestId('status')).toHaveText('Chưa diễn ra');

  const old = await row(id);
  expect(old.status).toBe('cancelled');
  expect(old.cancelled_by).toBe('student');
  expect(old.cancel_reason).toBe('Đổi giờ');

  const { data: children } = await adminDb()
    .from('sessions')
    .select('id, student_id, pt_id')
    .eq('rescheduled_from', id);
  expect(children).toHaveLength(1);
  expect(children![0].student_id).toBe(A1);
  expect(children![0].pt_id).toBe(PT_A);
});

test('reschedule onto another booking is refused and changes nothing', async ({ page }) => {
  const id = await insertSession(30);
  // another PT A session on the target slot
  const target = new Date(`${vnDatePlus(3)}T10:00:00+07:00`);
  await adminDb().from('sessions').insert({
    gym_id: GYM,
    pt_id: PT_A,
    student_id: A2,
    start_at: target.toISOString(),
    end_at: new Date(target.getTime() + 3600_000).toISOString(),
  });

  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${id}?reschedule=1`);
  await page.getByLabel('Ngày mới').fill(vnDatePlus(3));
  await page.getByLabel('Giờ mới').fill('10:30');
  await page.getByRole('button', { name: 'Đổi giờ' }).click();
  await expect(page.getByText(/Trùng lịch với Học viên A2/)).toBeVisible();
  expect((await row(id)).status).toBe('scheduled');
});

test('a cancelled session can be re-opened', async ({ page }) => {
  const id = await insertSession(30, {
    status: 'cancelled',
    cancelled_by: 'student',
    cancelled_at: new Date().toISOString(),
    cancel_reason: 'Bận',
  });
  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${id}`);
  await page.getByRole('button', { name: 'Mở lại buổi' }).click();
  await expect(page.getByTestId('status')).toHaveText('Chưa diễn ra');
  const r = await row(id);
  expect(r.status).toBe('scheduled');
  expect(r.cancelled_at).toBeNull();
  expect(r.cancelled_by).toBeNull();
});

test('post-session checklist can record "Học viên huỷ"', async ({ page }) => {
  const id = await insertSession(-3);
  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${id}`);
  await page.getByRole('button', { name: 'Học viên huỷ' }).click();
  await expect(page.getByTestId('status')).toHaveText('Đã huỷ');
  const r = await row(id);
  expect(r.cancelled_by).toBe('student');
});

test('PT cancelling from the session page is recorded as cancelled_by pt', async ({ page }) => {
  const id = await insertSession(30);
  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${id}`);
  await page.getByLabel('Lý do huỷ').fill('PT bận');
  await page.getByRole('button', { name: 'Huỷ buổi' }).click();
  await expect(page.getByTestId('status')).toHaveText('Đã huỷ');
  expect((await row(id)).cancelled_by).toBe('pt');
});
