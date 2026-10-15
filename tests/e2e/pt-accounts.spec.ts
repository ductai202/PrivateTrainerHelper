import { test, expect, type Page } from '@playwright/test';
import { adminDb, loginAs } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

const STAMP = Date.now();
const EMAIL = `pt.new.${STAMP}@demo.test`;

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
}

test.afterAll(async () => {
  const db = adminDb();
  const { data } = await db.auth.admin.listUsers({ perPage: 200 });
  const user = data.users.find((u) => u.email === EMAIL);
  if (user) await db.auth.admin.deleteUser(user.id);
});

test('owner creates a PT with a temp password; PT logs in and changes it', async ({ page }) => {
  await loginAs(page, 'owner');
  await page.goto('/owner');
  await page.getByPlaceholder('Tên PT').fill(`PT Mới ${STAMP}`);
  await page.getByPlaceholder('Email PT').fill(EMAIL);
  await page.getByRole('button', { name: 'Tạo tài khoản PT' }).click();

  const tempEl = page.getByTestId('temp-password');
  await expect(tempEl).toBeVisible();
  const temp = (await tempEl.innerText()).trim();
  expect(temp).toHaveLength(12);

  // new PT signs in with the temporary password
  await page.context().clearCookies();
  await login(page, EMAIL, temp);
  await expect(page).toHaveURL(/today/);

  // validation on the change-password form
  await page.goto('/settings');
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('short');
  await page.getByLabel('Nhập lại mật khẩu').fill('short');
  await page.getByRole('button', { name: 'Đổi mật khẩu' }).click();
  await expect(page.getByText('Mật khẩu phải có ít nhất 8 ký tự')).toBeVisible();

  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('new-password-1');
  await page.getByLabel('Nhập lại mật khẩu').fill('different-1');
  await page.getByRole('button', { name: 'Đổi mật khẩu' }).click();
  await expect(page.getByText('Hai mật khẩu không khớp')).toBeVisible();

  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('new-password-1');
  await page.getByLabel('Nhập lại mật khẩu').fill('new-password-1');
  await page.getByRole('button', { name: 'Đổi mật khẩu' }).click();
  await expect(page.getByText('Đã đổi mật khẩu')).toBeVisible();

  // old password no longer works, new one does
  await page.context().clearCookies();
  await login(page, EMAIL, temp);
  await expect(page.getByText('Email hoặc mật khẩu không đúng')).toBeVisible();
  await login(page, EMAIL, 'new-password-1');
  await expect(page).toHaveURL(/today/);
});

test('a PT cannot create accounts', async ({ page }) => {
  await loginAs(page, 'ptA');
  await page.goto('/owner');
  await expect(page).toHaveURL(/today/);
});
