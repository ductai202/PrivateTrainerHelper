import { test, expect } from '@playwright/test';
import { adminDb, resetRecentSessions } from './helpers';

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const A1 = 'cccccccc-0000-0000-0000-000000000001';

test('bot reply acts on the reminded session, not the next one', async ({ request }) => {
  await resetRecentSessions();
  const db = adminDb();
  const mkSession = async (hoursAhead: number) => {
    const start = new Date(Date.now() + hoursAhead * 3600_000);
    const { data } = await db
      .from('sessions')
      .insert({
        gym_id: GYM, pt_id: PT_A, student_id: A1,
        start_at: start.toISOString(),
        end_at: new Date(start.getTime() + 3600_000).toISOString(),
      })
      .select('id')
      .single();
    return data!.id as string;
  };
  const tonight = await mkSession(2);
  const tomorrow = await mkSession(14);
  await db.from('students').update({ zalo_bot_chat_id: 'chat-target-1' }).eq('id', A1);
  await db.from('message_log').insert({
    gym_id: GYM, session_id: tomorrow, student_id: A1, channel: 'bot', kind: 'reminder', content: 'x',
  });

  const res = await request.post('/api/zalo-bot/webhook', {
    headers: { 'x-bot-api-secret-token': 'local-bot-secret' },
    data: { message: { chat: { id: 'chat-target-1' }, text: 'huỷ' } },
  });
  expect(res.status()).toBe(200);
  const status = async (id: string) =>
    (await db.from('sessions').select('status').eq('id', id).single()).data!.status;
  expect(await status(tomorrow)).toBe('cancelled');
  expect(await status(tonight)).toBe('scheduled');
  await db.from('students').update({ zalo_bot_chat_id: null }).eq('id', A1);
});

test('link code is rotated after use', async ({ request }) => {
  const db = adminDb();
  await db.from('students').update({ zalo_bot_chat_id: null }).eq('id', A1);
  const { data: before } = await db.from('students').select('bot_link_code').eq('id', A1).single();
  await request.post('/api/zalo-bot/webhook', {
    headers: { 'x-bot-api-secret-token': 'local-bot-secret' },
    data: { message: { chat: { id: 'chat-rotate-1' }, text: before!.bot_link_code } },
  });
  const { data: after } = await db.from('students').select('bot_link_code, zalo_bot_chat_id').eq('id', A1).single();
  expect(after!.zalo_bot_chat_id).toBe('chat-rotate-1');
  expect(after!.bot_link_code).not.toBe(before!.bot_link_code);
  await db.from('students').update({ zalo_bot_chat_id: null }).eq('id', A1);
});
