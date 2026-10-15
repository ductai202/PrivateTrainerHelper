import { test, expect } from '@playwright/test';
import { adminDb, loginAs, resetRecentSessions, vnToday } from './helpers';
import { signSessionToken, signStudentToken } from '../../lib/links/token';

test.use({ viewport: { width: 375, height: 812 } });

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const A1 = 'cccccccc-0000-0000-0000-000000000001';
const A2 = 'cccccccc-0000-0000-0000-000000000002';
const PKG_A1 = 'dddddddd-0000-0000-0000-000000000001';
const SECRET = 'local-link-secret';

function vnDatePlus(days: number): string {
  const d = new Date(`${vnToday()}T12:00:00+07:00`);
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
}

async function insertSession(
  start: Date,
  studentId = A1,
  extra: Record<string, unknown> = {},
) {
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

const at = (offsetDays: number, hhmm: string) => new Date(`${vnDatePlus(offsetDays)}T${hhmm}:00+07:00`);

async function studentToken(studentId = A1, expiresInDays = 30) {
  const { data } = await adminDb().from('students').select('link_version').eq('id', studentId).single();
  return signStudentToken(
    studentId,
    data!.link_version,
    new Date(Date.now() + expiresInDays * 24 * 3600_000),
    SECRET,
  );
}

async function restoreAvailability() {
  const db = adminDb();
  await db.from('student_availability').delete().eq('student_id', A1);
  await db.from('student_availability').insert(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      gym_id: GYM,
      student_id: A1,
      weekday,
      from_time: '06:00',
      to_time: '21:00',
    })),
  );
}

test.beforeEach(async () => {
  await resetRecentSessions();
  const db = adminDb();
  await db.from('reschedule_requests').delete().eq('student_id', A1);
  await db.from('waitlist_entries').delete().eq('student_id', A1);
  await db.from('students').update({ archived: false }).in('id', [A1, A2]);
});

test.afterAll(async () => {
  await restoreAvailability();
  const db = adminDb();
  await db.from('waitlist_entries').delete().eq('student_id', A1);
  await db.from('students').delete().like('full_name', 'Rank Test%');
});

test('personal link shows the student their balance and upcoming sessions', async ({ page }) => {
  await insertSession(at(2, '10:00'));
  await page.goto(`/s/${await studentToken()}`);
  await expect(page.getByRole('heading', { name: /Học viên A1/ })).toBeVisible();
  await expect(page.getByTestId('remaining')).toHaveText(/Còn \d+ buổi/);
  await expect(page.getByTestId('upcoming-session')).toHaveCount(1);
  await expect(page.getByTestId('upcoming-session')).toContainText('10:00');
});

test('invalid, expired and tampered personal links are refused', async ({ page }) => {
  const bad = 'Liên kết không hợp lệ hoặc đã hết hạn.';
  await page.goto('/s/garbage');
  await expect(page.getByText(bad)).toBeVisible();

  await page.goto(`/s/${await studentToken(A1, -1)}`);
  await expect(page.getByText(bad)).toBeVisible();

  const wrongSecret = signStudentToken(A1, 1, new Date(Date.now() + 86400_000), 'not-the-secret');
  await page.goto(`/s/${wrongSecret}`);
  await expect(page.getByText(bad)).toBeVisible();

  // a session token must not open the personal page
  await page.goto(`/s/${signSessionToken('f5651989-b6ac-4828-bfeb-1cc0483e0cb1', SECRET)}`);
  await expect(page.getByText(bad)).toBeVisible();
});

test('PT regenerates the personal link and the old one stops working', async ({ page }) => {
  const oldToken = await studentToken();
  await page.goto(`/s/${oldToken}`);
  await expect(page.getByRole('heading', { name: /Học viên A1/ })).toBeVisible();

  await loginAs(page, 'ptA');
  await page.goto(`/students/${A1}`);
  const before = await page.getByTestId('student-link').innerText();
  await page.getByRole('button', { name: 'Tạo link mới' }).click();
  await expect(page.getByTestId('student-link')).not.toHaveText(before);

  await page.goto(`/s/${oldToken}`);
  await expect(page.getByText('Liên kết không hợp lệ hoặc đã hết hạn.')).toBeVisible();
});

test('student updates their free hours and the old ones are replaced', async ({ page }) => {
  const db = adminDb();
  await db.from('student_availability').delete().eq('student_id', A1);
  await db.from('student_availability').insert({
    gym_id: GYM,
    student_id: A1,
    weekday: 2,
    from_time: '08:00',
    to_time: '10:00',
  });

  await page.goto(`/s/${await studentToken()}`);
  await expect(page.getByLabel('Thứ 3', { exact: true })).toBeChecked();
  await page.getByLabel('Thứ 3', { exact: true }).uncheck();
  await page.getByLabel('Thứ 5', { exact: true }).check();
  await page.getByLabel('Rảnh từ').fill('17:00');
  await page.getByLabel('Rảnh đến').fill('19:00');
  await page.getByRole('button', { name: 'Lưu giờ rảnh' }).click();
  await expect(page.getByText('Đã lưu giờ rảnh')).toBeVisible();

  const { data } = await db
    .from('student_availability')
    .select('weekday, from_time, to_time')
    .eq('student_id', A1);
  expect(data).toHaveLength(1);
  expect(data![0].weekday).toBe(4);
  expect(data![0].from_time.slice(0, 5)).toBe('17:00');
  expect(data![0].to_time.slice(0, 5)).toBe('19:00');
  await restoreAvailability();
});

test('a window that ends before it starts is rejected', async ({ page }) => {
  await page.goto(`/s/${await studentToken()}`);
  await page.getByLabel('Thứ 4', { exact: true }).check();
  await page.getByLabel('Rảnh từ').fill('19:00');
  await page.getByLabel('Rảnh đến').fill('17:00');
  await page.getByRole('button', { name: 'Lưu giờ rảnh' }).click();
  await expect(page.getByText('Giờ kết thúc phải sau giờ bắt đầu')).toBeVisible();
});

test('waitlist: join, leave, and the PT sees it', async ({ page }) => {
  const token = await studentToken();
  await page.goto(`/s/${token}`);
  await page.getByRole('button', { name: 'Muốn tập thêm' }).click();
  await expect(page.getByText('Bạn đang trong danh sách chờ')).toBeVisible();

  const { data } = await adminDb().from('waitlist_entries').select('active').eq('student_id', A1);
  expect(data).toEqual([{ active: true }]);

  // joining twice does not create a second active entry
  await page.reload();
  await expect(page.getByRole('button', { name: 'Muốn tập thêm' })).toHaveCount(0);

  await loginAs(page, 'ptA');
  await page.goto('/reminders');
  await expect(page.getByRole('heading', { name: 'Danh sách chờ' })).toBeVisible();
  await expect(page.getByTestId('waitlist-row').filter({ hasText: 'Học viên A1' })).toBeVisible();

  await page.context().clearCookies();
  await page.goto(`/s/${token}`);
  await page.getByRole('button', { name: 'Rút khỏi danh sách chờ' }).click();
  await expect(page.getByRole('button', { name: 'Muốn tập thêm' })).toBeVisible();
  const after = await adminDb().from('waitlist_entries').select('active').eq('student_id', A1);
  expect(after.data!.every((r) => r.active === false)).toBe(true);
});

test('fill-in suggestions invite the waitlisted student first', async ({ page }) => {
  const db = adminDb();
  // a second candidate who would normally rank above A1 (no sessions this week)
  const { data: rank } = await db
    .from('students')
    .insert({ gym_id: GYM, pt_id: PT_A, full_name: `Rank Test ${Date.now()}`, phone: '0911222333' })
    .select('id')
    .single();
  await db.from('packages').insert({ gym_id: GYM, student_id: rank!.id, total_sessions: 10, start_date: vnToday() });
  await db.from('student_availability').insert(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      gym_id: GYM,
      student_id: rank!.id,
      weekday,
      from_time: '06:00',
      to_time: '21:00',
    })),
  );
  // A1 already trained today, so by the weekly rule alone A1 ranks below Rank Test
  await insertSession(new Date(Date.now() - 2 * 3600_000), A1, { status: 'done', student_signed: true });
  await db.from('waitlist_entries').insert({ gym_id: GYM, student_id: A1 });

  const cancelled = await insertSession(at(2, '10:00'), A2, { status: 'cancelled' });
  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${cancelled}`);
  const names = page.getByTestId('fill-in-name');
  await expect(names.first()).toHaveText('Học viên A1');
  await expect(page.getByTestId('fill-in-waitlist').first()).toBeVisible();
});

test('reschedule request: student picks a free slot, PT approves, session moves', async ({ page }) => {
  const original = at(3, '10:00');
  const id = await insertSession(original);
  const token = await studentToken();

  await page.goto(`/s/${token}`);
  const card = page.getByTestId('upcoming-session').first();
  const select = card.getByLabel('Giờ mới');
  await select.selectOption({ index: 1 });
  await card.getByRole('button', { name: 'Gửi yêu cầu đổi giờ' }).click();
  await expect(card.getByTestId('request-status')).toContainText('Đã gửi yêu cầu');

  const { data: reqs } = await adminDb()
    .from('reschedule_requests')
    .select('id, status, requested_start')
    .eq('session_id', id);
  expect(reqs).toHaveLength(1);
  expect(reqs![0].status).toBe('pending');
  const wanted = new Date(reqs![0].requested_start).getTime();
  expect(wanted).not.toBe(original.getTime());

  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${id}`);
  await expect(page.getByTestId('reschedule-request')).toBeVisible();
  await page.getByRole('button', { name: 'Đồng ý đổi giờ' }).click();
  await expect(page).not.toHaveURL(new RegExp(id));

  const old = await adminDb().from('sessions').select('status, cancelled_by').eq('id', id).single();
  expect(old.data).toMatchObject({ status: 'cancelled', cancelled_by: 'student' });
  const moved = await adminDb().from('sessions').select('start_at').eq('rescheduled_from', id);
  expect(moved.data).toHaveLength(1);
  expect(new Date(moved.data![0].start_at).getTime()).toBe(wanted);
  const done = await adminDb().from('reschedule_requests').select('status').eq('session_id', id).single();
  expect(done.data!.status).toBe('approved');
});

test('reschedule request: PT declines and nothing changes', async ({ page }) => {
  const id = await insertSession(at(3, '10:00'));
  const token = await studentToken();
  await page.goto(`/s/${token}`);
  const card = page.getByTestId('upcoming-session').first();
  await card.getByLabel('Giờ mới').selectOption({ index: 1 });
  await card.getByRole('button', { name: 'Gửi yêu cầu đổi giờ' }).click();
  await expect(card.getByTestId('request-status')).toContainText('Đã gửi yêu cầu');

  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${id}`);
  await page.getByRole('button', { name: 'Từ chối' }).click();
  await expect(page.getByTestId('reschedule-request')).toHaveCount(0);

  const s = await adminDb().from('sessions').select('status').eq('id', id).single();
  expect(s.data!.status).toBe('scheduled');
  await page.context().clearCookies();
  await page.goto(`/s/${token}`);
  await expect(page.getByTestId('request-status').first()).toContainText('PT chưa đổi được');
});

test('approving a request whose slot was taken meanwhile is refused', async ({ page }) => {
  const id = await insertSession(at(3, '10:00'));
  const token = await studentToken();
  await page.goto(`/s/${token}`);
  const card = page.getByTestId('upcoming-session').first();
  await card.getByLabel('Giờ mới').selectOption({ index: 1 });
  await card.getByRole('button', { name: 'Gửi yêu cầu đổi giờ' }).click();
  await expect(card.getByTestId('request-status')).toContainText('Đã gửi yêu cầu');

  const { data: req } = await adminDb()
    .from('reschedule_requests')
    .select('requested_start')
    .eq('session_id', id)
    .single();
  // someone else takes that slot before the PT answers
  await insertSession(new Date(req!.requested_start), A2);

  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${id}`);
  await page.getByRole('button', { name: 'Đồng ý đổi giờ' }).click();
  await expect(page.getByText(/Trùng lịch với/)).toBeVisible();
  const s = await adminDb().from('sessions').select('status').eq('id', id).single();
  expect(s.data!.status).toBe('scheduled');
});

test('a student cannot request a slot the PT does not have free', async ({ request }) => {
  const id = await insertSession(at(3, '10:00'));
  const busy = at(3, '15:00');
  await insertSession(busy, A2);
  // call the endpoint behind the form directly with the busy slot
  const token = await studentToken();
  const res = await request.post('/api/student/reschedule', {
    data: { token, sessionId: id, start: busy.toISOString() },
  });
  expect(res.status()).toBe(409);
  const { data } = await adminDb().from('reschedule_requests').select('id').eq('session_id', id);
  expect(data).toHaveLength(0);
});

test('revoking a session link kills it', async ({ page }) => {
  const id = await insertSession(at(3, '10:00'));
  const token = signSessionToken(id, SECRET);
  await page.goto(`/c/${token}`);
  await expect(page.getByTestId('link-status')).toBeVisible();

  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${id}`);
  await page.getByRole('button', { name: 'Thu hồi link buổi' }).click();
  await expect(page.getByText('Đã thu hồi link của buổi này')).toBeVisible();

  await page.context().clearCookies();
  await page.goto(`/c/${token}`);
  await expect(page.getByText('Liên kết không hợp lệ hoặc đã hết hạn.')).toBeVisible();
});

test('a cancellation through the link records who and when, and counts as late', async ({ page }) => {
  const soon = new Date(Date.now() + 2 * 3600_000); // within 4 hours
  const id = await insertSession(soon);
  await page.goto(`/c/${signSessionToken(id, SECRET)}`);
  await page.getByRole('button', { name: 'Huỷ buổi' }).click();
  await expect(page.getByTestId('link-status')).toHaveText('Buổi này đã được huỷ.');

  const { data } = await adminDb()
    .from('sessions')
    .select('status, cancelled_by, cancelled_at')
    .eq('id', id)
    .single();
  expect(data!.status).toBe('cancelled');
  expect(data!.cancelled_by).toBe('student');
  expect(data!.cancelled_at).not.toBeNull();

  await loginAs(page, 'ptA');
  await page.goto(`/students/${A1}`);
  await expect(page.getByText('Huỷ sát giờ (30 ngày): 1')).toBeVisible();
});
