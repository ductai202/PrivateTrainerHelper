import { test, expect } from '@playwright/test';
import { adminDb, loginAs, resetRecentSessions } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const A1 = 'cccccccc-0000-0000-0000-000000000001';
const FAKE = 'http://127.0.0.1:4010';

async function futureSession() {
  const start = new Date(Date.now() + 30 * 3600_000);
  const { data } = await adminDb()
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
  return data!.id as string;
}

test.beforeEach(async () => {
  await resetRecentSessions();
  await adminDb()
    .from('students')
    .update({ health_notes: 'Đau gối trái nhẹ', goal: 'Giảm mỡ' })
    .eq('id', A1);
});

test.afterAll(async () => {
  await adminDb().from('students').update({ health_notes: null }).eq('id', A1);
});

test('PT gets a draft, edits it and saves it as the session workout', async ({ page, request }) => {
  const id = await futureSession();
  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${id}`);

  await page.getByRole('button', { name: 'Gợi ý bài tập' }).click();
  const draft = page.getByLabel('Bản nháp bài tập');
  await expect(draft).toBeVisible();
  await expect(draft).toHaveValue(/1\. Squat — 4 x 10 · nghỉ 90s/);

  await draft.fill('1. Squat — 4 x 8 · nghỉ 120s (PT đã sửa)');
  await page.getByRole('button', { name: 'Lưu bản nháp' }).click();
  await expect(page.getByText('Đã ghi bài tập')).toBeVisible();

  const { data } = await adminDb().from('sessions').select('workout_content, workout_logged').eq('id', id).single();
  expect(data!.workout_logged).toBe(true);
  expect(data!.workout_content).toContain('PT đã sửa');

  // what left the building: model + context, but no phone number or full name
  const sent = JSON.stringify(await (await request.get(`${FAKE}/last-request`)).json());
  expect(sent).toContain('test/model');
  expect(sent).toContain('Đau gối trái nhẹ');
  expect(sent).not.toContain('0900000001');
  expect(sent).not.toContain('Học viên A1');
});

test('a provider failure shows a friendly message and keeps the page usable', async ({ page }) => {
  await adminDb().from('students').update({ health_notes: 'FAIL_ME' }).eq('id', A1);
  const id = await futureSession();
  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${id}`);
  await page.getByRole('button', { name: 'Gợi ý bài tập' }).click();
  await expect(page.getByText('AI đang bận, thử lại sau ít phút')).toBeVisible();
  await expect(page.getByLabel('Nội dung bài tập')).toBeVisible();
});

test('an unusable answer is reported, not saved', async ({ page }) => {
  await adminDb().from('students').update({ health_notes: 'BAD_JSON' }).eq('id', A1);
  const id = await futureSession();
  await loginAs(page, 'ptA');
  await page.goto(`/sessions/${id}`);
  await page.getByRole('button', { name: 'Gợi ý bài tập' }).click();
  await expect(page.getByText('AI trả về nội dung không dùng được, hãy thử lại')).toBeVisible();
  const { data } = await adminDb().from('sessions').select('workout_logged').eq('id', id).single();
  expect(data!.workout_logged).toBe(false);
});

test('another PT cannot generate a draft for this session', async ({ page }) => {
  const id = await futureSession();
  await loginAs(page, 'ptB');
  await page.goto(`/sessions/${id}`);
  await expect(page.getByText('Không tìm thấy buổi tập')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gợi ý bài tập' })).toHaveCount(0);
});
