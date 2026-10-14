import type { Page } from '@playwright/test';

export const USERS = {
  owner: 'owner@demo.test',
  ptA: 'pt.a@demo.test',
  ptB: 'pt.b@demo.test',
} as const;

export async function loginAs(page: Page, who: keyof typeof USERS) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(USERS[who]);
  await page.getByPlaceholder('Mật khẩu').fill('demo12345');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('**/today');
}

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function env(key: string): string {
  const line = readFileSync('.env.local', 'utf8')
    .split('\n')
    .find((l) => l.startsWith(key + '='));
  return line!.slice(key.length + 1).trim();
}

export function adminDb() {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

/** Remove sessions created by earlier e2e runs (everything from yesterday onwards). */
export async function resetRecentSessions() {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  await adminDb().from('sessions').delete().gte('start_at', since);
}

export function vnToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}
