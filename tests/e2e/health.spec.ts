import { test, expect } from '@playwright/test';

test('health check answers without logging in and proves the database is reachable', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.db).toBe(true);
  expect(typeof body.at).toBe('string');
});

test('health check leaks no data or configuration', async ({ request }) => {
  const text = await (await request.get('/api/health')).text();
  expect(text).not.toMatch(/eyJ|sb_|secret|key|@|gym/i);
  expect(Object.keys(JSON.parse(text)).sort()).toEqual(['at', 'db', 'ok']);
});

test('health check only answers GET', async ({ request }) => {
  const res = await request.post('/api/health');
  expect(res.status()).toBe(405);
});
