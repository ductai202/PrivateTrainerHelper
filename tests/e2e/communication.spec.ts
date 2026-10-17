import { test, expect, type APIRequestContext } from '@playwright/test';
import { adminDb, loginAs, resetRecentSessions, vnToday } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const A1 = 'cccccccc-0000-0000-0000-000000000001';
const A2 = 'cccccccc-0000-0000-0000-000000000002';
const FAKE = 'http://127.0.0.1:4010';
const BOT = { 'x-bot-api-secret-token': 'local-bot-secret' };

let n = 0;
const chat = () => `chat-comm-${Date.now()}-${(n += 1)}`;

function vnDatePlus(days: number): string {
  const d = new Date(`${vnToday()}T12:00:00+07:00`);
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
}

async function insertSession(studentId: string, start: Date, extra: Record<string, unknown> = {}) {
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

async function setPeople(opts: {
  pt?: { gender: string | null; birth_year: number | null };
  a1?: { gender: string | null; birth_year: number | null };
  a2?: { gender: string | null; birth_year: number | null };
}) {
  const db = adminDb();
  if (opts.pt) await db.from('members').update(opts.pt).eq('id', PT_A);
  if (opts.a1) await db.from('students').update(opts.a1).eq('id', A1);
  if (opts.a2) await db.from('students').update(opts.a2).eq('id', A2);
}

const DEFAULTS = {
  pt: { gender: 'male', birth_year: 1992 },
  a1: { gender: 'female', birth_year: 1995 },
  a2: { gender: 'male', birth_year: 1990 },
};

test.beforeEach(async ({ request }) => {
  await resetRecentSessions();
  const db = adminDb();
  await setPeople(DEFAULTS);
  await db.from('students').update({ zalo_bot_chat_id: null }).in('id', [A1, A2]);
  await db.from('message_log').delete().in('student_id', [A1, A2]);
  await db.from('bot_link_attempts').delete().like('chat_id', 'chat-comm-%');
  await db.from('bot_hints').delete().like('chat_id', 'chat-comm-%');
  await request.post(`${FAKE}/reset-sent`);
});

test.afterAll(async () => {
  await setPeople(DEFAULTS);
  await adminDb().from('students').update({ zalo_bot_chat_id: null }).in('id', [A1, A2]);
});

async function reminderFor(page: import('@playwright/test').Page, studentName: string) {
  await page.goto('/reminders');
  const row = page.getByTestId('reminder-row').filter({ hasText: studentName });
  await expect(row).toBeVisible();
  return row.innerText();
}

test.describe('forms of address in the PT message', () => {
  test.beforeEach(async () => {
    const tomorrow = new Date(`${vnDatePlus(1)}T10:00:00+07:00`);
    await insertSession(A1, tomorrow);
    await insertSession(A2, new Date(`${vnDatePlus(1)}T15:00:00+07:00`));
  });

  test('younger student: em, and the PT says anh', async ({ page }) => {
    await loginAs(page, 'ptA');
    const text = await reminderFor(page, 'Học viên A1');
    expect(text).toContain('Hi em A1 ơi 👋 Anh nhắc lịch tập lúc 10:00');
    expect(text).toContain('Em xác nhận giúp anh nhé!');
    expect(text).toContain('Bận thì bấm link báo anh liền nha');
  });

  test('peer within two years: bạn / mình', async ({ page }) => {
    await loginAs(page, 'ptA');
    const text = await reminderFor(page, 'Học viên A2');
    expect(text).toContain('Hi bạn A2 ơi 👋 Mình nhắc lịch tập lúc 15:00');
  });

  test('older male student: anh, and the PT says em', async ({ page }) => {
    await setPeople({ a2: { gender: 'male', birth_year: 1980 } });
    await loginAs(page, 'ptA');
    const text = await reminderFor(page, 'Học viên A2');
    expect(text).toContain('Hi anh A2 ơi 👋 Em nhắc lịch tập lúc 15:00');
    expect(text).toContain('Anh xác nhận giúp em nhé!');
  });

  test('older female student: chị', async ({ page }) => {
    await setPeople({ a2: { gender: 'female', birth_year: 1980 } });
    await loginAs(page, 'ptA');
    const text = await reminderFor(page, 'Học viên A2');
    expect(text).toContain('Hi chị A2 ơi 👋 Em nhắc lịch tập');
  });

  test('a female PT says chị to a younger student', async ({ page }) => {
    await setPeople({ pt: { gender: 'female', birth_year: 1992 } });
    await loginAs(page, 'ptA');
    const text = await reminderFor(page, 'Học viên A1');
    expect(text).toContain('Hi em A1 ơi 👋 Chị nhắc lịch tập');
    expect(text).toContain('Em xác nhận giúp chị nhé!');
  });

  test('missing PT profile or student birth year falls back to bạn / mình', async ({ page }) => {
    await setPeople({ pt: { gender: null, birth_year: null } });
    await loginAs(page, 'ptA');
    expect(await reminderFor(page, 'Học viên A1')).toContain('Hi bạn A1 ơi 👋 Mình nhắc lịch tập');

    await setPeople({ pt: DEFAULTS.pt, a1: { gender: 'female', birth_year: null } });
    await page.reload();
    expect(await reminderFor(page, 'Học viên A1')).toContain('Hi bạn A1 ơi 👋 Mình nhắc lịch tập');
  });

  test('an older student of unknown gender is not guessed', async ({ page }) => {
    await setPeople({ a2: { gender: null, birth_year: 1975 } });
    await loginAs(page, 'ptA');
    expect(await reminderFor(page, 'Học viên A2')).toContain('Hi bạn A2 ơi 👋 Mình nhắc lịch tập');
  });
});

test.describe('PT profile', () => {
  test('a PT saves gender and birth year, and invalid years are refused', async ({ page }) => {
    await loginAs(page, 'ptA');
    await page.goto('/settings');
    await page.getByLabel('Giới tính', { exact: true }).selectOption('female');
    await page.getByLabel('Năm sinh').fill('1999');
    await page.getByRole('button', { name: 'Lưu thông tin' }).click();
    await expect(page.getByText('Đã lưu thông tin')).toBeVisible();
    const { data } = await adminDb().from('members').select('gender, birth_year').eq('id', PT_A).single();
    expect(data).toEqual({ gender: 'female', birth_year: 1999 });

    await page.getByLabel('Năm sinh').fill('1900');
    await page.getByRole('button', { name: 'Lưu thông tin' }).click();
    await expect(page.getByText(/Năm sinh phải từ 1940/)).toBeVisible();
    const again = await adminDb().from('members').select('birth_year').eq('id', PT_A).single();
    expect(again.data!.birth_year).toBe(1999);

    await page.getByLabel('Năm sinh').fill('abc');
    await page.getByRole('button', { name: 'Lưu thông tin' }).click();
    await expect(page.getByText(/Năm sinh phải từ 1940/)).toBeVisible();
  });

  test('the profile shows what was saved after a reload', async ({ page }) => {
    await loginAs(page, 'ptA');
    await page.goto('/settings');
    await expect(page.getByLabel('Giới tính', { exact: true })).toHaveValue('male');
    await expect(page.getByLabel('Năm sinh')).toHaveValue('1992');
  });
});

test.describe('owner creates a PT', () => {
  const email = `pt.profile.${Date.now()}@demo.test`;

  test.afterAll(async () => {
    const db = adminDb();
    const { data } = await db.auth.admin.listUsers({ perPage: 200 });
    const u = data.users.find((x) => x.email === email);
    if (u) await db.auth.admin.deleteUser(u.id);
  });

  test('stores gender and birth year and starts with the 22:00 review time', async ({ page }) => {
    await loginAs(page, 'owner');
    await page.goto('/owner');
    await page.getByPlaceholder('Tên PT').fill('PT Profile');
    await page.getByPlaceholder('Email PT').fill(email);
    await page.getByLabel('Giới tính PT').selectOption('female');
    await page.getByPlaceholder('Năm sinh PT').fill('1997');
    await page.getByRole('button', { name: 'Tạo tài khoản PT' }).click();
    await expect(page.getByTestId('temp-password')).toBeVisible();

    const { data } = await adminDb()
      .from('members')
      .select('gender, birth_year, evening_review_time, role')
      .eq('display_name', 'PT Profile')
      .single();
    expect(data).toMatchObject({ gender: 'female', birth_year: 1997, role: 'pt' });
    expect(data!.evening_review_time.slice(0, 5)).toBe('22:00');
  });

  test('refuses an impossible birth year and creates nothing', async ({ page }) => {
    await loginAs(page, 'owner');
    await page.goto('/owner');
    await page.getByPlaceholder('Tên PT').fill('PT Bad Year');
    await page.getByPlaceholder('Email PT').fill(`bad.${Date.now()}@demo.test`);
    await page.getByPlaceholder('Năm sinh PT').fill('1800');
    await page.getByRole('button', { name: 'Tạo tài khoản PT' }).click();
    await expect(page.getByText(/Năm sinh phải từ 1940/)).toBeVisible();
    const { data } = await adminDb().from('members').select('id').eq('display_name', 'PT Bad Year');
    expect(data).toHaveLength(0);
  });
});

test.describe('bot speaks in the right voice', () => {
  async function connect(request: APIRequestContext, studentId = A1) {
    const c = chat();
    const { data } = await adminDb().from('students').select('bot_link_code').eq('id', studentId).single();
    expect((await (await post(request, c, data!.bot_link_code)).json()).linked).toBe(true);
    return c;
  }

  test('connect, confirm and busy replies use em / anh', async ({ request }) => {
    const c = await connect(request);
    expect((await sentTo(request, c))[0]).toContain('Kết nối xong rồi nha em A1');

    const id = await insertSession(A1, new Date(Date.now() + 100 * 60_000));
    await adminDb().from('message_log').insert({
      gym_id: GYM, session_id: id, student_id: A1, channel: 'bot', kind: 'precheck', content: 'x',
    });
    await post(request, c, 'OK');
    expect((await sentTo(request, c)).at(-1)).toBe('Ok em, anh ghi nhận rồi nha. Hẹn gặp em!');

    await post(request, c, 'Bận');
    expect((await sentTo(request, c)).at(-1)).toBe('Anh ghi nhận em bận rồi nha, hẹn em buổi sau 👍');
  });

  test('a peer student is answered with bạn / mình', async ({ request }) => {
    const c = await connect(request, A2);
    expect((await sentTo(request, c))[0]).toContain('Kết nối xong rồi nha bạn A2');
  });

  test('the 2-hour question uses the right voice', async ({ request }) => {
    const c = await connect(request);
    await insertSession(A1, new Date(Date.now() + 100 * 60_000));
    await request.post('/api/cron/tick', { headers: { authorization: 'Bearer local-cron-secret' } });
    const q = (await sentTo(request, c)).find((t) => /vẫn tập/.test(t));
    expect(q).toMatch(/^Em A1 ơi, mình vẫn tập lúc \d\d:\d\d nha\?/);
  });

  test('"?" returns the guide with a working personal link', async ({ request, page }) => {
    const c = await connect(request);
    await post(request, c, '?');
    const help = (await sentTo(request, c)).at(-1)!;
    expect(help).toContain('Hướng dẫn nhanh nè em A1');
    expect(help).toContain('"OK"');
    expect(help).toContain('"Bận"');
    expect(help).toContain('"stop"');

    const link = /(https?:\/\/\S+\/s\/\S+)/.exec(help)?.[1];
    expect(link).toBeTruthy();
    // the link's origin comes from APP_BASE_URL, which may be a tunnel; open the path on the app under test
    await page.goto(new URL(link!).pathname);
    await expect(page.getByRole('heading', { name: /Lịch tập của Học viên A1/ })).toBeVisible();
  });

  test('help also answers to "hướng dẫn" and "help"', async ({ request }) => {
    const c = await connect(request);
    await post(request, c, 'hướng dẫn');
    await post(request, c, 'Help');
    expect((await sentTo(request, c)).filter((t) => t.startsWith('Hướng dẫn nhanh'))).toHaveLength(2);
  });

  test('chatter gets one hint and then silence; nothing changes', async ({ request }) => {
    const c = await connect(request);
    const id = await insertSession(A1, new Date(Date.now() + 100 * 60_000));
    await adminDb().from('message_log').insert({
      gym_id: GYM, session_id: id, student_id: A1, channel: 'bot', kind: 'precheck', content: 'x',
    });
    const before = (await sentTo(request, c)).length;

    for (const text of ['xin chào', 'hôm nay trời đẹp quá', 'bạn ơi cho mình hỏi', 'ahihi']) {
      const res = await post(request, c, text);
      expect(res.status()).toBe(200);
    }
    const after = await sentTo(request, c);
    expect(after.length - before).toBe(1);
    expect(after.at(-1)).toContain('trả lời "OK"');

    const { data } = await adminDb().from('sessions').select('status').eq('id', id).single();
    expect(data!.status).toBe('scheduled');

    // a real command still works while chatter is muted
    await post(request, c, 'OK');
    const { data: s } = await adminDb().from('sessions').select('status').eq('id', id).single();
    expect(s!.status).toBe('confirmed');
  });

  test('another chat gets its own hint', async ({ request }) => {
    const a = await connect(request, A1);
    const b = await connect(request, A2);
    await post(request, a, 'blah');
    await post(request, b, 'blah');
    expect((await sentTo(request, a)).filter((t) => /^(Em|Anh|Chị|Bạn) trả lời "OK"/.test(t))).toHaveLength(1);
    expect((await sentTo(request, b)).filter((t) => /^(Em|Anh|Chị|Bạn) trả lời "OK"/.test(t))).toHaveLength(1);
  });

  test('an unlinked chat is asked for a code only once per cooldown', async ({ request }) => {
    const c = chat();
    await post(request, c, 'alo');
    await post(request, c, 'alo alo');
    await post(request, c, 'có ai không');
    const prompts = (await sentTo(request, c)).filter((t) => /nhập mã kết nối/.test(t));
    expect(prompts).toHaveLength(1);
  });

  test('"stop" disconnects and messages are then treated as unlinked', async ({ request }) => {
    const c = await connect(request);
    await post(request, c, 'stop');
    const { data } = await adminDb().from('students').select('zalo_bot_chat_id').eq('id', A1).single();
    expect(data!.zalo_bot_chat_id).toBeNull();
    await post(request, c, 'OK');
    expect((await sentTo(request, c)).at(-1)).toContain('nhập mã kết nối');
  });
});
