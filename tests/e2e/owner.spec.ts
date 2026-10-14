import { test, expect } from '@playwright/test';
import { adminDb, loginAs } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

const GYM = '11111111-0000-0000-0000-000000000001';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const PT_B = 'bbbbbbbb-0000-0000-0000-000000000003';
const A1 = 'cccccccc-0000-0000-0000-000000000001';
const B1 = 'cccccccc-0000-0000-0000-000000000003';

const MONTH_START = '2026-01-';

async function seed() {
  const db = adminDb();
  await db.from('sessions').delete().gte('start_at', '2026-01-01').lt('start_at', '2026-02-01');
  const row = (pt: string, st: string, day: string, extra: Record<string, unknown>) => ({
    gym_id: GYM,
    pt_id: pt,
    student_id: st,
    start_at: `${MONTH_START}${day}T03:00:00Z`,
    end_at: `${MONTH_START}${day}T04:00:00Z`,
    ...extra,
  });
  const { error } = await db.from('sessions').insert([
    row(PT_A, A1, '10', { status: 'done', student_signed: true }),
    row(PT_A, A1, '11', { status: 'done', student_signed: false }),
    row(PT_A, A1, '12', { status: 'cancelled', student_signed: false }),
    row(PT_B, B1, '10', { status: 'done', student_signed: true }),
  ]);
  if (error) throw error;
}

test.beforeAll(seed);
test.afterAll(async () => {
  await adminDb().from('sessions').delete().gte('start_at', '2026-01-01').lt('start_at', '2026-02-01');
});

test('owner sees monthly numbers per PT and unsigned sessions', async ({ page }) => {
  await loginAs(page, 'owner');
  await page.goto('/owner?m=2026-01');
  const a = page.getByRole('row', { name: /PT An/ });
  await expect(a.getByTestId('done')).toHaveText('2');
  await expect(a.getByTestId('unsigned')).toHaveText('1');
  await expect(a.getByTestId('cancelled')).toHaveText('1');
  const b = page.getByRole('row', { name: /PT Bình/ });
  await expect(b.getByTestId('done')).toHaveText('1');
  await expect(b.getByTestId('unsigned')).toHaveText('0');
  await expect(page.getByRole('heading', { name: 'Buổi chưa ký' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Học viên A1/ })).toHaveCount(1);
});

test('PT cannot open the owner page', async ({ page }) => {
  await loginAs(page, 'ptA');
  await page.goto('/owner');
  await expect(page).toHaveURL(/today/);
});
