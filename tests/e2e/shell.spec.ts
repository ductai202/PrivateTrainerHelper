import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test('manifest is linked and installable fields present', async ({ page, request }) => {
  await page.goto('/login');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const m = await (await request.get(href!)).json();
  expect(m.display).toBe('standalone');
  expect(m.lang).toBe('vi');
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
});

test('service worker registers', async ({ page }) => {
  await page.goto('/login');
  await expect
    .poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())))
    .toBe(true);
});
