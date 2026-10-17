import { test, expect } from '@playwright/test';
import { adminDb, resetRecentSessions } from './helpers';
import { signStudentToken } from '../../lib/links/token';

test.use({ viewport: { width: 375, height: 812 } });

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const A1 = 'cccccccc-0000-0000-0000-000000000001';
const A2 = 'cccccccc-0000-0000-0000-000000000002';
const PKG_A1 = 'dddddddd-0000-0000-0000-000000000001';
const SECRET = 'local-link-secret';

async function tokenFor(studentId: string) {
  const { data } = await adminDb().from('students').select('link_version').eq('id', studentId).single();
  return signStudentToken(studentId, data!.link_version, new Date(Date.now() + 86400_000), SECRET);
}

test.beforeEach(async () => {
  await resetRecentSessions();
  const db = adminDb();
  await db.from('meal_plans').delete().in('student_id', [A1, A2]);
  await db.from('progress_notes').delete().in('student_id', [A1, A2]);
  await db.from('sessions').delete().eq('student_id', A1).not('workout_content', 'is', null);
  await db.from('students').update({ goal: 'Giảm mỡ bụng' }).eq('id', A1);
  await db.from('body_measurements').delete().eq('student_id', A1);
  await db.from('body_measurements').insert([
    { gym_id: GYM, student_id: A1, measured_on: new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10), weight_kg: 58, waist_cm: 72 },
    { gym_id: GYM, student_id: A1, measured_on: new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10), weight_kg: 56, waist_cm: 70 },
  ]);
});

test.afterAll(async () => {
  const db = adminDb();
  await db.from('sessions').delete().eq('student_id', A1).not('workout_content', 'is', null);
  await db.from('meal_plans').delete().in('student_id', [A1, A2]);
  await db.from('progress_notes').delete().in('student_id', [A1, A2]);
  await db.from('body_measurements').delete().in('student_id', [A1, A2]).gte('measured_on', '2026-01-01').eq('note', 'portal-test');
});

test('the student sees their own goal, current meal plan, progress and recent workouts', async ({ page }) => {
  const db = adminDb();
  await db.from('meal_plans').insert([
    { gym_id: GYM, student_id: A1, effective_from: '2026-09-01', content: 'CŨ: yến mạch', calories: 1800 },
    { gym_id: GYM, student_id: A1, effective_from: '2026-10-01', content: 'MỚI: ức gà và rau', calories: 1700 },
  ]);
  const when = new Date(Date.now() - 2 * 24 * 3600_000);
  await db.from('sessions').insert({
    gym_id: GYM,
    pt_id: PT_A,
    student_id: A1,
    package_id: PKG_A1,
    start_at: when.toISOString(),
    end_at: new Date(when.getTime() + 3600_000).toISOString(),
    status: 'done',
    student_signed: true,
    workout_logged: true,
    workout_content: '1. Squat — 4 x 10',
  });

  await page.goto(`/s/${await tokenFor(A1)}`);
  await expect(page.getByTestId('portal-goal')).toContainText('Giảm mỡ bụng');
  await expect(page.getByTestId('portal-meal')).toContainText('MỚI: ức gà và rau');
  await expect(page.getByTestId('portal-meal')).not.toContainText('CŨ: yến mạch');
  await expect(page.getByTestId('portal-meal')).toContainText('1700');

  // the two seeded measurements, newest first
  const rows = page.getByTestId('portal-measurement-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('56');
  await expect(rows.last()).toContainText('58');
  await expect(page.getByTestId('measurement-chart').locator('svg').first()).toBeVisible();

  await expect(page.getByTestId('portal-workout').first()).toContainText('Squat — 4 x 10');
});

test('another student data never shows up', async ({ page }) => {
  const db = adminDb();
  await db.from('meal_plans').insert({
    gym_id: GYM,
    student_id: A2,
    effective_from: '2026-10-01',
    content: 'RIÊNG CỦA A2',
  });
  await db.from('students').update({ goal: 'MỤC TIÊU RIÊNG A2' }).eq('id', A2);
  await db.from('body_measurements').insert({
    gym_id: GYM,
    student_id: A2,
    measured_on: '2026-10-05',
    weight_kg: 99.9,
    note: 'portal-test',
  });

  await page.goto(`/s/${await tokenFor(A1)}`);
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('RIÊNG CỦA A2');
  expect(body).not.toContain('MỤC TIÊU RIÊNG A2');
  expect(body).not.toContain('99.9');
  await db.from('students').update({ goal: 'Tăng cơ' }).eq('id', A2);
});

test('empty states are friendly', async ({ page }) => {
  const db = adminDb();
  await db.from('students').update({ goal: null }).eq('id', A1);
  await db.from('body_measurements').delete().eq('student_id', A1);
  await page.goto(`/s/${await tokenFor(A1)}`);
  await expect(page.getByTestId('portal-meal')).toContainText('Chưa có thực đơn');
  await expect(page.getByTestId('portal-goal')).toContainText('Chưa có mục tiêu');
  await expect(page.getByText('Chưa có số đo nào')).toBeVisible();
  await expect(page.getByText('Chưa có bài tập nào được ghi')).toBeVisible();
  // put the seeded measurements back for the other specs
  await db.from('body_measurements').insert([
    { gym_id: GYM, student_id: A1, measured_on: new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10), weight_kg: 58, waist_cm: 72 },
    { gym_id: GYM, student_id: A1, measured_on: new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10), weight_kg: 56, waist_cm: 70 },
  ]);
});

test('the page is read-only for these details (no edit controls for health data)', async ({ page }) => {
  await page.goto(`/s/${await tokenFor(A1)}`);
  await expect(page.getByRole('button', { name: /Lưu thực đơn|Cập nhật tình trạng|Lưu bài tập/ })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: /Thực đơn|Nhận xét/ })).toHaveCount(0);
});
