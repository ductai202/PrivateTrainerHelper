import { test, expect } from '@playwright/test';
import { adminDb, resetRecentSessions, vnToday } from './helpers';

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const A1 = 'cccccccc-0000-0000-0000-000000000001';
const A2 = 'cccccccc-0000-0000-0000-000000000002';
const AUTH = { authorization: 'Bearer local-cron-secret' };

async function insertSession(
  startOffsetMin: number,
  extra: Record<string, unknown> = {},
  studentId = A1,
) {
  const start = new Date(Date.now() + startOffsetMin * 60_000);
  const { data, error } = await adminDb()
    .from('sessions')
    .insert({
      gym_id: GYM,
      pt_id: PT_A,
      student_id: studentId,
      start_at: start.toISOString(),
      end_at: new Date(start.getTime() + 3600_000).toISOString(),
      ...extra,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

const precheckAt = async (id: string) =>
  (await adminDb().from('sessions').select('precheck_pushed_at').eq('id', id).single()).data!
    .precheck_pushed_at as string | null;

test.beforeEach(async () => {
  await resetRecentSessions();
  await adminDb().from('push_log').delete().eq('for_date', vnToday());
  await adminDb().from('members').update({ evening_review_time: '20:00' }).eq('id', PT_A);
});

test.afterAll(async () => {
  await adminDb().from('members').update({ evening_review_time: '20:00' }).eq('id', PT_A);
  await adminDb().from('push_log').delete().eq('for_date', vnToday());
});

test('tick marks a precheck once for a session starting within 90 minutes', async ({ request }) => {
  const soon = await insertSession(60);
  const later = await insertSession(300, {}, A2);
  expect(await precheckAt(soon)).toBeNull();

  const first = await request.post('/api/cron/tick', { headers: AUTH });
  expect(first.status()).toBe(200);
  const stamp = await precheckAt(soon);
  expect(stamp).not.toBeNull();
  expect(await precheckAt(later)).toBeNull();

  // a second tick must not push (and therefore not re-stamp) the same session
  await request.post('/api/cron/tick', { headers: AUTH });
  expect(await precheckAt(soon)).toBe(stamp);
});

test('tick skips precheck for cancelled sessions', async ({ request }) => {
  const id = await insertSession(45, { status: 'cancelled' });
  await request.post('/api/cron/tick', { headers: AUTH });
  expect(await precheckAt(id)).toBeNull();
});

test('evening review honours the PT chosen time', async ({ request }) => {
  // a session tomorrow that has not been reminded
  const t = new Date(`${vnToday()}T12:00:00+07:00`);
  t.setDate(t.getDate() + 1);
  const tomorrowDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(t);
  const tomorrowStart = new Date(`${tomorrowDay}T10:00:00+07:00`);
  await adminDb().from('sessions').insert({
    gym_id: GYM,
    pt_id: PT_A,
    student_id: A1,
    start_at: tomorrowStart.toISOString(),
    end_at: new Date(tomorrowStart.getTime() + 3600_000).toISOString(),
  });
  const logged = async () =>
    (
      await adminDb()
        .from('push_log')
        .select('kind')
        .eq('member_id', PT_A)
        .eq('for_date', vnToday())
        .eq('kind', 'tomorrow')
    ).data!.length;

  // review time still in the future -> nothing yet
  await adminDb().from('members').update({ evening_review_time: '23:59' }).eq('id', PT_A);
  await request.post('/api/cron/tick', { headers: AUTH });
  expect(await logged()).toBe(0);

  // review time already passed -> logged exactly once
  await adminDb().from('members').update({ evening_review_time: '00:00' }).eq('id', PT_A);
  await request.post('/api/cron/tick', { headers: AUTH });
  await request.post('/api/cron/tick', { headers: AUTH });
  expect(await logged()).toBe(1);
});
