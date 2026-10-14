import { test, expect } from '@playwright/test';
import { adminDb, resetRecentSessions } from './helpers';
import { signSessionToken } from '../../lib/links/token';

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const A1 = 'cccccccc-0000-0000-0000-000000000001';
const LINK_SECRET = 'local-link-secret';
const BOT_SECRET = 'local-bot-secret';

async function futureSession(hoursAhead = 30) {
  const start = new Date(Date.now() + hoursAhead * 3600_000);
  const { data, error } = await adminDb()
    .from('sessions')
    .insert({
      gym_id: GYM,
      pt_id: PT_A,
      student_id: A1,
      start_at: start.toISOString(),
      end_at: new Date(start.getTime() + 3600_000).toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

const statusOf = async (id: string) =>
  (await adminDb().from('sessions').select('status, cancel_reason').eq('id', id).single()).data!;

test.beforeEach(async () => {
  await resetRecentSessions();
});

test('student confirms then cancels through the public link (no login)', async ({ page }) => {
  const id = await futureSession();
  const token = signSessionToken(id, LINK_SECRET);

  await page.goto(`/c/${token}`);
  await expect(page.getByTestId('link-status')).toHaveText('Buổi tập đang chờ bạn xác nhận.');
  await page.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(page.getByTestId('link-status')).toHaveText('Bạn đã xác nhận buổi này.');
  expect((await statusOf(id)).status).toBe('confirmed');

  await page.getByPlaceholder('Lý do huỷ (không bắt buộc)').fill('Ốm');
  await page.getByRole('button', { name: 'Huỷ buổi' }).click();
  await expect(page.getByTestId('link-status')).toHaveText('Buổi này đã được huỷ.');
  const s = await statusOf(id);
  expect(s.status).toBe('cancelled');
  expect(s.cancel_reason).toBe('Ốm');
});

test('tampered link is rejected', async ({ page }) => {
  const id = await futureSession();
  const token = signSessionToken(id, 'wrong-secret');
  await page.goto(`/c/${token}`);
  await expect(page.getByText('Liên kết không hợp lệ hoặc đã hết hạn.')).toBeVisible();
});

test('zalo bot webhook: secret check, link by code, confirm and cancel by reply', async ({ request }) => {
  const id = await futureSession();
  const db = adminDb();
  await db.from('students').update({ zalo_bot_chat_id: null }).eq('id', A1);
  const { data: st } = await db.from('students').select('bot_link_code').eq('id', A1).single();

  const post = (text: string, headers: Record<string, string>) =>
    request.post('/api/zalo-bot/webhook', {
      headers,
      data: { message: { chat: { id: 'chat-e2e-1' }, text } },
    });
  const ok = { 'x-bot-api-secret-token': BOT_SECRET };

  expect((await post('OK', {})).status()).toBe(401);
  expect((await post('OK', { 'x-bot-api-secret-token': 'nope' })).status()).toBe(401);

  // not linked yet: a reply does nothing to the session
  await post('OK', ok);
  expect((await statusOf(id)).status).toBe('scheduled');

  const linked = await (await post(st!.bot_link_code, ok)).json();
  expect(linked.linked).toBe(true);
  const { data: after } = await db.from('students').select('zalo_bot_chat_id').eq('id', A1).single();
  expect(after!.zalo_bot_chat_id).toBe('chat-e2e-1');

  await post('OK ạ', ok);
  expect((await statusOf(id)).status).toBe('confirmed');
  await post('huỷ', ok);
  expect((await statusOf(id)).status).toBe('cancelled');

  await db.from('students').update({ zalo_bot_chat_id: null }).eq('id', A1);
});
