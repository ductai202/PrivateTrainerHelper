import { test, expect, type Page } from '@playwright/test';
import { adminDb, loginAs, resetRecentSessions, vnToday } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

const GYM1 = '11111111-0000-0000-0000-000000000001';
const GYM2 = '33333333-0000-0000-0000-000000000003';
const PT_A = 'bbbbbbbb-0000-0000-0000-000000000002';
const PT_C = 'bbbbbbbb-0000-0000-0000-000000000013';
const A1 = 'cccccccc-0000-0000-0000-000000000001';
const C1 = 'cccccccc-0000-0000-0000-000000000011';
const PKG_A1 = 'dddddddd-0000-0000-0000-000000000001';

const centerSwitcher = (page: Page) => page.getByRole('combobox', { name: 'Trung tâm' });

async function switchTo(page: Page, name: string) {
  await centerSwitcher(page).selectOption({ label: name });
  await expect(page.getByTestId('center-name')).toHaveText(name);
}

test.beforeEach(async () => {
  await resetRecentSessions();
});

test.describe('who sees what', () => {
  test('a PT and a single-center owner have no center switcher', async ({ page }) => {
    await loginAs(page, 'ptA');
    await expect(page.getByTestId('center-name')).toHaveText('Demo Gym');
    await expect(centerSwitcher(page)).toHaveCount(0);
    await page.context().clearCookies();
    await loginAs(page, 'owner');
    await expect(centerSwitcher(page)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Trung tâm', exact: true })).toHaveCount(0);
  });

  test('the admin lands in the first center and can switch to the second', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page.getByTestId('center-name')).toHaveText('Demo Gym');
    await expect(centerSwitcher(page)).toBeVisible();

    await page.goto('/students');
    await expect(page.getByText('Học viên A1')).toBeVisible();
    await expect(page.getByText('Học viên C1')).toHaveCount(0);

    await switchTo(page, 'Demo Gym 2');
    await page.goto('/students');
    await expect(page.getByText('Học viên C1')).toBeVisible();
    await expect(page.getByText('Học viên A1')).toHaveCount(0);
  });

  test('the chosen center sticks across pages and after a reload', async ({ page }) => {
    await loginAs(page, 'admin');
    await switchTo(page, 'Demo Gym 2');
    for (const path of ['/week', '/owner', '/reminders', '/settings']) {
      await page.goto(path);
      await expect(page.getByTestId('center-name')).toHaveText('Demo Gym 2');
    }
    await page.goto('/owner');
    await expect(page.getByRole('link', { name: 'PT Cường' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'PT An' })).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('center-name')).toHaveText('Demo Gym 2');
  });

  test('sessions of the other center do not leak into Today', async ({ page }) => {
    const start = new Date(Date.now() + 2 * 3600_000);
    await adminDb().from('sessions').insert({
      gym_id: GYM1,
      pt_id: PT_A,
      student_id: A1,
      package_id: PKG_A1,
      start_at: start.toISOString(),
      end_at: new Date(start.getTime() + 3600_000).toISOString(),
    });
    await loginAs(page, 'admin');
    await page.goto('/week');
    await expect(page.getByTestId('session-card').filter({ hasText: 'Học viên A1' }).first()).toBeVisible();

    await switchTo(page, 'Demo Gym 2');
    await page.goto('/week');
    await expect(page.getByTestId('session-card').filter({ hasText: 'Học viên A1' })).toHaveCount(0);
  });

  test('a center owner only ever sees their own center', async ({ page }) => {
    await loginAs(page, 'owner2');
    await expect(page.getByTestId('center-name')).toHaveText('Demo Gym 2');
    await page.goto('/students');
    await expect(page.getByText('Học viên C1')).toBeVisible();
    await expect(page.getByText('Học viên A1')).toHaveCount(0);

    await page.goto(`/students/${A1}`);
    await expect(page.getByText('Không tìm thấy học viên')).toBeVisible();
  });

  test('a forged center cookie does not open another center', async ({ page, context }) => {
    await loginAs(page, 'ptA');
    await context.addCookies([{ name: 'active_gym', value: GYM2, url: 'http://localhost:3000' }]);
    await page.goto('/students');
    await expect(page.getByTestId('center-name')).toHaveText('Demo Gym');
    await expect(page.getByText('Học viên C1')).toHaveCount(0);

    await context.addCookies([{ name: 'active_gym', value: 'not-a-uuid', url: 'http://localhost:3000' }]);
    await page.goto('/today');
    await expect(page.getByTestId('center-name')).toHaveText('Demo Gym');
  });

  test('admin edits a student of another center and the record keeps that center', async ({ page }) => {
    await loginAs(page, 'admin'); // active center: Demo Gym
    await page.goto(`/students/${C1}?tab=progress`);
    await page.getByLabel('Cân nặng (kg)').fill('61.5');
    await page.getByRole('button', { name: 'Cập nhật tình trạng' }).click();
    await expect(page.getByTestId('measurement-row').first()).toContainText('61.5');

    const { data } = await adminDb()
      .from('body_measurements')
      .select('gym_id')
      .eq('student_id', C1)
      .eq('weight_kg', 61.5);
    expect(data).toEqual([{ gym_id: GYM2 }]);
    await adminDb().from('body_measurements').delete().eq('student_id', C1).eq('weight_kg', 61.5);
  });
});

test.describe('platform admin page', () => {
  test('only the platform admin can open it', async ({ page }) => {
    for (const who of ['ptA', 'owner', 'owner2'] as const) {
      await page.context().clearCookies();
      await loginAs(page, who);
      await page.goto('/admin');
      await expect(page).toHaveURL(/today/);
    }
  });

  test('lists every center with its numbers', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.getByRole('link', { name: 'Trung tâm', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Các trung tâm' })).toBeVisible();

    const gym1 = page.getByTestId('center-card').filter({ hasText: 'Demo Gym' }).first();
    await expect(gym1).toContainText('PT: 2');
    const { count } = await adminDb()
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', '11111111-0000-0000-0000-000000000001');
    await expect(gym1).toContainText(`Học viên: ${count}`);

    const gym2 = page.getByTestId('center-card').filter({ hasText: 'Demo Gym 2' });
    await expect(gym2).toContainText('PT: 1');
    await expect(gym2).toContainText('Học viên: 1');
  });

  test('opens a center from the list', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
    await page
      .getByTestId('center-card')
      .filter({ hasText: 'Demo Gym 2' })
      .getByRole('button', { name: 'Mở trung tâm' })
      .click();
    await expect(page.getByTestId('center-name')).toHaveText('Demo Gym 2');
  });

  test('creates a center, refuses duplicates and short names', async ({ page }) => {
    const name = `Trung tâm thử ${Date.now()}`;
    await loginAs(page, 'admin');
    await page.goto('/admin');

    await page.getByPlaceholder('Tên trung tâm').fill('A');
    await page.getByRole('button', { name: 'Tạo trung tâm' }).click();
    await expect(page.getByText('Vui lòng nhập tên trung tâm')).toBeVisible();

    await page.getByPlaceholder('Tên trung tâm').fill(name);
    await page.getByRole('button', { name: 'Tạo trung tâm' }).click();
    await expect(page.getByText(`Đã tạo trung tâm ${name}`)).toBeVisible();
    await expect(page.getByTestId('center-card').filter({ hasText: name })).toBeVisible();

    await page.getByPlaceholder('Tên trung tâm').fill(name);
    await page.getByRole('button', { name: 'Tạo trung tâm' }).click();
    await expect(page.getByText('Đã có trung tâm trùng tên')).toBeVisible();

    // the admin is now an owner of it and can switch there
    await switchTo(page, name);
    await adminDb().from('gyms').delete().eq('name', name);
  });

  test('creates a separate owner for a center, who then sees only that center', async ({ page, browser }) => {
    const gymName = `Trung tâm chủ ${Date.now()}`;
    const email = `owner.new.${Date.now()}@demo.test`;
    await loginAs(page, 'admin');
    await page.goto('/admin');
    await page.getByPlaceholder('Tên trung tâm').fill(gymName);
    await page.getByRole('button', { name: 'Tạo trung tâm' }).click();
    await expect(page.getByText(`Đã tạo trung tâm ${gymName}`)).toBeVisible();

    const card = page.getByTestId('center-card').filter({ hasText: gymName });
    await card.locator('summary').click();
    await card.getByPlaceholder('Tên chủ trung tâm').fill('Chủ Mới');
    await card.getByPlaceholder('Email chủ trung tâm').fill(email);
    await card.getByRole('button', { name: 'Tạo chủ trung tâm' }).click();
    const temp = (await card.getByTestId('center-owner-password').innerText()).trim();
    expect(temp).toHaveLength(12);

    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const other = await ctx.newPage();
    await other.goto('/login');
    await other.getByPlaceholder('Email').fill(email);
    await other.getByPlaceholder('Mật khẩu').fill(temp);
    await other.getByRole('button', { name: 'Đăng nhập' }).click();
    await other.waitForURL('**/today');
    await expect(other.getByTestId('center-name')).toHaveText(gymName);
    await expect(centerSwitcher(other)).toHaveCount(0);
    await other.goto('/admin');
    await expect(other).toHaveURL(/today/);
    await ctx.close();

    const db = adminDb();
    const { data } = await db.auth.admin.listUsers({ perPage: 200 });
    const u = data.users.find((x) => x.email === email);
    if (u) await db.auth.admin.deleteUser(u.id);
    await db.from('gyms').delete().eq('name', gymName);
  });

  test('a duplicate email for a center owner is refused cleanly', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
    const card = page.getByTestId('center-card').filter({ hasText: 'Demo Gym 2' });
    await card.locator('summary').click();
    await card.getByPlaceholder('Tên chủ trung tâm').fill('Trùng');
    await card.getByPlaceholder('Email chủ trung tâm').fill('owner2@demo.test');
    await card.getByRole('button', { name: 'Tạo chủ trung tâm' }).click();
    await expect(card.getByText('Email này đã có tài khoản')).toBeVisible();
  });
});

test.describe('owner views of a PT', () => {
  test('the owner opens a PT and sees their students and upcoming sessions', async ({ page }) => {
    const start = new Date(Date.now() + 5 * 3600_000);
    await adminDb().from('sessions').insert({
      gym_id: GYM1,
      pt_id: PT_A,
      student_id: A1,
      package_id: PKG_A1,
      start_at: start.toISOString(),
      end_at: new Date(start.getTime() + 3600_000).toISOString(),
    });
    await loginAs(page, 'owner');
    await page.goto('/owner');
    await page.getByRole('link', { name: 'PT An' }).click();
    await expect(page.getByRole('heading', { name: 'PT An' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Học viên của PT' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Học viên A1/ }).first()).toBeVisible();
    await expect(page.getByText('Học viên B1')).toHaveCount(0); // belongs to another PT
    await expect(page.getByRole('heading', { name: 'Buổi sắp tới' })).toBeVisible();
    await expect(page.getByTestId('session-card').first()).toBeVisible();
  });

  test('a PT cannot open the PT overview, and neither can an owner of another center', async ({
    page,
  }) => {
    await loginAs(page, 'ptA');
    await page.goto(`/owner/pts/${PT_A}`);
    await expect(page).toHaveURL(/today/);

    await page.context().clearCookies();
    await loginAs(page, 'owner2');
    await page.goto(`/owner/pts/${PT_A}`);
    await expect(page.getByText('Không tìm thấy PT')).toBeVisible();
    await page.goto(`/owner/pts/${PT_C}`);
    await expect(page.getByRole('heading', { name: 'PT Cường' })).toBeVisible();
  });

  test('an owner assigns a new student to a PT of their own center', async ({ page }) => {
    await loginAs(page, 'owner');
    await page.goto('/students/new');
    const pt = page.getByLabel('PT phụ trách');
    await expect(pt.locator('option')).toHaveText(['Chọn PT', 'PT An', 'PT Bình']);

    const name = `Owner Student ${Date.now()}`;
    await page.getByLabel('Họ tên').fill(name);
    await page.getByLabel('Số điện thoại').fill('0977 000 111');
    await page.getByRole('button', { name: 'Lưu học viên' }).click();
    await expect(page.getByText('Vui lòng chọn PT phụ trách học viên này')).toBeVisible();

    await pt.selectOption({ label: 'PT Bình' });
    await page.getByRole('button', { name: 'Lưu học viên' }).click();
    await expect(page).toHaveURL(/[0-9a-f-]{36}/);
    const { data } = await adminDb()
      .from('students')
      .select('pt_id, gym_id')
      .eq('full_name', name)
      .single();
    expect(data).toEqual({ pt_id: 'bbbbbbbb-0000-0000-0000-000000000003', gym_id: GYM1 });
  });

  test('a PT does not get a PT picker when adding a student', async ({ page }) => {
    await loginAs(page, 'ptA');
    await page.goto('/students/new');
    await expect(page.getByLabel('PT phụ trách')).toHaveCount(0);
  });
});

test('today date helper sanity', () => {
  expect(vnToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
