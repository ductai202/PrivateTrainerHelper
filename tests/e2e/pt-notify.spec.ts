import { test, expect, type APIRequestContext } from '@playwright/test';
import { adminDb, loginAs, resetRecentSessions, vnToday } from './helpers';
import { signSessionToken, signStudentToken } from '../../lib/links/token';

test.use({ viewport: { width: 375, height: 812 } });

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const A1 = 'cccccccc-0000-0000-0000-000000000001';
const FAKE = 'http://127.0.0.1:4010';
const BOT = { 'x-bot-api-secret-token': 'local-bot-secret' };
const CRON = { authorization: 'Bearer local-cron-secret' };
const LINK_SECRET = 'local-link-secret';

let n = 0;
const chat = (p: string) => `chat-${p}-${Date.now()}-${(n += 1)}`;

function vnDatePlus(days: number): string {
  const d = new Date(`${vnToday()}T12:00:00+07:00`);
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
}

async function insertSession(start: Date, extra: Record<string, unknown> = {}) {
  const { data, error } = await adminDb()
    .from('sessions')
    .insert({
      gym_id: GYM,
      pt_id: PT_A,
      student_id: A1,
      start_at: start.toISOString(),
      end_at: new Date(start.getTime() + 3600_000).toISOString(),
      ...extra,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

const post = (request: APIRequestContext, chatId: string, text: string) =>
  request.post('/api/zalo-bot/webhook', {
    headers: BOT,
    data: { message: { chat: { id: chatId }, text } },
  });

async function sentTo(request: APIRequestContext, chatId: string) {
  const all = (await (await request.get(`${FAKE}/sent-messages`)).json()) as {
    chat_id: string;
    text: string;
  }[];
  return all.filter((m) => m.chat_id === chatId).map((m) => m.text);
}

async function connectPt(request: APIRequestContext, chatId: string) {
  const { data } = await adminDb().from('members').select('bot_link_code').eq('id', PT_A).single();
  const res = await post(request, chatId, data!.bot_link_code);
  expect((await res.json()).linked).toBe(true);
}

test.beforeEach(async ({ request }) => {
  await resetRecentSessions();
  const db = adminDb();
  await db.from('members').update({ zalo_bot_chat_id: null, evening_review_time: '20:00' }).eq('id', PT_A);
  await db.from('students').update({ zalo_bot_chat_id: null }).eq('id', A1);
  await db.from('message_log').delete().eq('student_id', A1);
  await db.from('bot_link_attempts').delete().like('chat_id', 'chat-%');
  await db.from('reschedule_requests').delete().eq('student_id', A1);
  await db.from('push_log').delete().eq('for_date', vnToday());
  await request.post(`${FAKE}/reset-sent`);
});

test.afterAll(async () => {
  const db = adminDb();
  await db.from('members').update({ zalo_bot_chat_id: null, evening_review_time: '20:00' }).eq('id', PT_A);
  await db.from('students').update({ zalo_bot_chat_id: null }).eq('id', A1);
  await db.from('push_log').delete().eq('for_date', vnToday());
});

test('PT sees their connection code in Settings and can connect through the bot', async ({
  page,
  request,
}) => {
  await loginAs(page, 'ptA');
  await page.goto('/settings');
  const { data } = await adminDb().from('members').select('bot_link_code').eq('id', PT_A).single();
  await expect(page.getByTestId('pt-bot-code')).toHaveText(data!.bot_link_code);
  await expect(page.getByText('Chưa kết nối Zalo')).toBeVisible();

  const c = chat('pt');
  await connectPt(request, c);
  expect((await sentTo(request, c)).some((t) => /PT/.test(t) && /kết nối/i.test(t))).toBe(true);

  await page.reload();
  await expect(page.getByText('Đã kết nối Zalo')).toBeVisible();

  // codes are single-use
  const { data: after } = await adminDb().from('members').select('bot_link_code').eq('id', PT_A).single();
  expect(after!.bot_link_code).not.toBe(data!.bot_link_code);
});

test('student cancels through the link: the PT is told on Zalo', async ({ page, request }) => {
  const c = chat('pt');
  await connectPt(request, c);
  const id = await insertSession(new Date(Date.now() + 6 * 3600_000));

  await page.goto(`/c/${signSessionToken(id, LINK_SECRET)}`);
  await page.getByRole('button', { name: 'Huỷ buổi' }).click();
  await expect(page.getByTestId('link-status')).toHaveText('Buổi này đã được huỷ.');

  const msgs = await sentTo(request, c);
  expect(msgs.some((t) => t.includes('Học viên A1') && /huỷ/i.test(t))).toBe(true);
  expect(msgs.join('\n')).toContain(`/sessions/${id}`);
});

test('student confirms through the link: the PT is told on Zalo', async ({ page, request }) => {
  const c = chat('pt');
  await connectPt(request, c);
  const id = await insertSession(new Date(Date.now() + 6 * 3600_000));
  await page.goto(`/c/${signSessionToken(id, LINK_SECRET)}`);
  await page.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(page.getByTestId('link-status')).toHaveText('Bạn đã xác nhận buổi này.');
  expect((await sentTo(request, c)).some((t) => t.includes('Học viên A1') && /xác nhận/i.test(t))).toBe(
    true,
  );
});

test('student answers "Bận" to the bot: the PT is told on Zalo', async ({ request }) => {
  const ptChat = chat('pt');
  const studentChat = chat('st');
  await connectPt(request, ptChat);
  const id = await insertSession(new Date(Date.now() + 90 * 60_000));

  const { data } = await adminDb().from('students').select('bot_link_code').eq('id', A1).single();
  expect((await (await post(request, studentChat, data!.bot_link_code)).json()).linked).toBe(true);

  const tick = await request.post('/api/cron/tick', { headers: CRON });
  expect(tick.status()).toBe(200);
  expect((await sentTo(request, studentChat)).some((t) => /vẫn tập/.test(t))).toBe(true);

  await post(request, studentChat, 'Bận');
  const { data: s } = await adminDb().from('sessions').select('status').eq('id', id).single();
  expect(s!.status).toBe('cancelled');

  const msgs = await sentTo(request, ptChat);
  expect(msgs.some((t) => t.includes('Học viên A1') && /huỷ/i.test(t))).toBe(true);
});

test('a reschedule request reaches the PT on Zalo', async ({ request }) => {
  const c = chat('pt');
  await connectPt(request, c);
  const start = new Date(`${vnDatePlus(2)}T10:00:00+07:00`);
  const id = await insertSession(start);
  const { data: st } = await adminDb().from('students').select('link_version').eq('id', A1).single();
  const token = signStudentToken(A1, st!.link_version, new Date(Date.now() + 86400_000), LINK_SECRET);

  const wanted = new Date(`${vnDatePlus(2)}T14:00:00+07:00`);
  const res = await request.post('/api/student/reschedule', {
    data: { token, sessionId: id, start: wanted.toISOString() },
  });
  expect(res.status()).toBe(200);
  expect((await sentTo(request, c)).some((t) => t.includes('Học viên A1') && /đổi giờ/i.test(t))).toBe(true);
});

test('the PT precheck ("vẫn tập chứ?") also arrives on Zalo', async ({ request }) => {
  const c = chat('pt');
  await connectPt(request, c);
  await insertSession(new Date(Date.now() + 60 * 60_000));
  await request.post('/api/cron/tick', { headers: CRON });
  const msgs = await sentTo(request, c);
  expect(msgs.some((t) => /vẫn tập chứ/.test(t) && t.includes('Học viên A1'))).toBe(true);

  // once only
  await request.post('/api/cron/tick', { headers: CRON });
  expect((await sentTo(request, c)).filter((t) => /vẫn tập chứ/.test(t))).toHaveLength(1);
});

test('the evening summary arrives on Zalo at the PT chosen time', async ({ request }) => {
  const c = chat('pt');
  await connectPt(request, c);
  await adminDb().from('members').update({ evening_review_time: '00:00' }).eq('id', PT_A);
  await insertSession(new Date(`${vnDatePlus(1)}T10:00:00+07:00`));
  await request.post('/api/cron/tick', { headers: CRON });
  expect((await sentTo(request, c)).some((t) => /Mai có \d+ buổi/.test(t))).toBe(true);
});

test('students get the day-before reminder through the bot with their link', async ({ request }) => {
  const studentChat = chat('st');
  const { data } = await adminDb().from('students').select('bot_link_code').eq('id', A1).single();
  await post(request, studentChat, data!.bot_link_code);
  await insertSession(new Date(`${vnDatePlus(1)}T10:00:00+07:00`));

  await request.post('/api/cron/tick', { headers: CRON });
  const msgs = await sentTo(request, studentChat);
  const reminder = msgs.find((t) => /nhắc lịch tập/.test(t));
  expect(reminder).toBeTruthy();
  expect(reminder).toMatch(/\/c\//);
});

test('"stop" from the PT chat disconnects it', async ({ request }) => {
  const c = chat('pt');
  await connectPt(request, c);
  await post(request, c, 'stop');
  const { data } = await adminDb().from('members').select('zalo_bot_chat_id').eq('id', PT_A).single();
  expect(data!.zalo_bot_chat_id).toBeNull();
});

test('a message from an unknown chat is not mistaken for a PT', async ({ request }) => {
  const c = chat('nobody');
  const res = await post(request, c, 'OK');
  expect((await res.json()).linked).toBe(false);
  const { data } = await adminDb().from('members').select('zalo_bot_chat_id').eq('id', PT_A).single();
  expect(data!.zalo_bot_chat_id).toBeNull();
});
