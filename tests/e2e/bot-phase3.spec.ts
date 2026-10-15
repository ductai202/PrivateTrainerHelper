import { test, expect, type APIRequestContext } from '@playwright/test';
import { adminDb, resetRecentSessions } from './helpers';

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const A1 = 'cccccccc-0000-0000-0000-000000000001';
const FAKE = 'http://127.0.0.1:4010';
const BOT = { 'x-bot-api-secret-token': 'local-bot-secret' };
const CRON = { authorization: 'Bearer local-cron-secret' };

let counter = 0;
const chat = () => `chat-p3-${Date.now()}-${(counter += 1)}`;

async function insertSession(startOffsetMin: number, extra: Record<string, unknown> = {}) {
  const start = new Date(Date.now() + startOffsetMin * 60_000);
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

const sessionRow = async (id: string) =>
  (
    await adminDb()
      .from('sessions')
      .select('status, cancelled_by, bot_precheck_sent_at')
      .eq('id', id)
      .single()
  ).data!;

const studentRow = async () =>
  (await adminDb().from('students').select('zalo_bot_chat_id, bot_link_code').eq('id', A1).single()).data!;

async function post(
  request: APIRequestContext,
  chatId: string,
  text: string,
  extra: Record<string, unknown> = {},
) {
  return request.post('/api/zalo-bot/webhook', {
    headers: BOT,
    data: { ...extra, message: { chat: { id: chatId }, text } },
  });
}

async function sentTo(request: APIRequestContext, chatId: string) {
  const all = (await (await request.get(`${FAKE}/sent-messages`)).json()) as {
    chat_id: string;
    text: string;
  }[];
  return all.filter((m) => m.chat_id === chatId);
}

async function connect(request: APIRequestContext, chatId: string) {
  const { bot_link_code } = await studentRow();
  const res = await post(request, chatId, bot_link_code);
  expect((await res.json()).linked).toBe(true);
}

test.beforeEach(async ({ request }) => {
  await resetRecentSessions();
  await adminDb().from('students').update({ zalo_bot_chat_id: null }).eq('id', A1);
  await adminDb().from('message_log').delete().eq('student_id', A1);
  await adminDb().from('bot_link_attempts').delete().like('chat_id', 'chat-p3-%');
  await adminDb().from('bot_updates').delete().like('update_id', 'p3-%');
  await request.post(`${FAKE}/reset-sent`);
});

test.afterAll(async () => {
  await adminDb().from('students').update({ zalo_bot_chat_id: null }).eq('id', A1);
});

test('the same webhook delivery is processed only once', async ({ request }) => {
  const c = chat();
  const id = await insertSession(180);
  await connect(request, c);
  await adminDb().from('message_log').insert({
    gym_id: GYM, session_id: id, student_id: A1, channel: 'bot', kind: 'reminder', content: 'x',
  });

  const first = await post(request, c, 'OK', { update_id: 'p3-dup-1' });
  expect((await first.json()).result).toBe('confirmed');
  expect((await sessionRow(id)).status).toBe('confirmed');
  const before = (await sentTo(request, c)).length;

  // PT cancels in the meantime; Zalo redelivers the old "OK": it must not flip the session back
  await adminDb().from('sessions').update({ status: 'cancelled' }).eq('id', id);
  const again = await post(request, c, 'OK', { update_id: 'p3-dup-1' });
  expect((await again.json()).duplicate).toBe(true);
  expect((await sessionRow(id)).status).toBe('cancelled');
  expect((await sentTo(request, c)).length).toBe(before);
});

test('"Bận" cancels the session the student was asked about and records it as student-cancelled', async ({
  request,
}) => {
  const c = chat();
  const id = await insertSession(90);
  await connect(request, c);
  await adminDb().from('message_log').insert({
    gym_id: GYM, session_id: id, student_id: A1, channel: 'bot', kind: 'precheck', content: 'x',
  });

  const res = await post(request, c, 'Em bận ạ');
  expect((await res.json()).result).toBe('cancelled');
  const s = await sessionRow(id);
  expect(s.status).toBe('cancelled');
  expect(s.cancelled_by).toBe('student');
  expect((await sentTo(request, c)).some((m) => /huỷ/i.test(m.text))).toBe(true);
});

test('a casual message containing "bạn" never cancels anything', async ({ request }) => {
  const c = chat();
  const id = await insertSession(90);
  await connect(request, c);
  await adminDb().from('message_log').insert({
    gym_id: GYM, session_id: id, student_id: A1, channel: 'bot', kind: 'precheck', content: 'x',
  });
  await post(request, c, 'bạn ơi cho mình hỏi');
  expect((await sessionRow(id)).status).toBe('scheduled');
});

test('"stop" disconnects the chat and later replies are ignored', async ({ request }) => {
  const c = chat();
  const id = await insertSession(90);
  await connect(request, c);
  await adminDb().from('message_log').insert({
    gym_id: GYM, session_id: id, student_id: A1, channel: 'bot', kind: 'precheck', content: 'x',
  });

  await post(request, c, 'stop');
  expect((await studentRow()).zalo_bot_chat_id).toBeNull();
  await post(request, c, 'Bận');
  expect((await sessionRow(id)).status).toBe('scheduled');
});

test('link codes are rate limited per chat and a used code is single-use', async ({ request }) => {
  const c = chat();
  const { bot_link_code } = await studentRow();
  for (let i = 0; i < 5; i += 1) {
    const r = await post(request, c, `00000${i}`);
    expect((await r.json()).linked).toBe(false);
  }
  // even the right code is refused while the chat is over the limit
  const limited = await post(request, c, bot_link_code);
  const body = await limited.json();
  expect(body.linked).toBe(false);
  expect(body.limited).toBe(true);
  expect((await studentRow()).zalo_bot_chat_id).toBeNull();

  // a different chat is unaffected, and once used the code stops working for others
  const d = chat();
  expect((await (await post(request, d, bot_link_code)).json()).linked).toBe(true);
  const other = chat();
  expect((await (await post(request, other, bot_link_code)).json()).linked).toBe(false);
});

test('cron asks connected students 2 hours ahead, once, via the bot', async ({ request }) => {
  const c = chat();
  const soon = await insertSession(100);
  const later = await insertSession(400);
  const cancelled = await insertSession(60, { status: 'cancelled' });
  await connect(request, c);

  const first = await request.post('/api/cron/tick', { headers: CRON });
  expect(first.status()).toBe(200);

  const msgs = await sentTo(request, c);
  const asked = msgs.filter((m) => /vẫn tập/.test(m.text));
  expect(asked).toHaveLength(1);
  expect((await sessionRow(soon)).bot_precheck_sent_at).not.toBeNull();
  expect((await sessionRow(later)).bot_precheck_sent_at).toBeNull();
  expect((await sessionRow(cancelled)).bot_precheck_sent_at).toBeNull();

  // logged as the last question so a reply targets this session
  const { data: log } = await adminDb()
    .from('message_log')
    .select('session_id, kind, channel')
    .eq('session_id', soon);
  expect(log).toEqual([{ session_id: soon, kind: 'precheck', channel: 'bot' }]);

  await request.post('/api/cron/tick', { headers: CRON });
  expect((await sentTo(request, c)).filter((m) => /vẫn tập/.test(m.text))).toHaveLength(1);

  // and the reply acts on it
  await post(request, c, 'Bận');
  expect((await sessionRow(soon)).status).toBe('cancelled');
});

test('students without a connected chat are not messaged', async ({ request }) => {
  const id = await insertSession(100);
  await request.post('/api/cron/tick', { headers: CRON });
  expect((await sessionRow(id)).bot_precheck_sent_at).toBeNull();
});
