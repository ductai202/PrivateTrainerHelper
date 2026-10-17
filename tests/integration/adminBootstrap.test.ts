import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureOwner } from '@/lib/admin/bootstrap';

function env(key: string): string {
  const line = readFileSync('.env.local', 'utf8').split('\n').find((l) => l.startsWith(key + '='));
  return line!.slice(key.length + 1).trim();
}

const URL = env('NEXT_PUBLIC_SUPABASE_URL');
const admin = createClient(URL, env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const anon = () =>
  createClient(URL, env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), { auth: { persistSession: false } });

const STAMP = Date.now();
const EMAIL = `owner.${STAMP}@bootstrap.test`;
const GYM = `Bootstrap Gym ${STAMP}`;
const createdUsers: string[] = [];
const createdGyms: string[] = [];

async function userByEmail(email: string) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === email);
}

afterAll(async () => {
  for (const gym of createdGyms) await admin.from('gyms').delete().eq('id', gym);
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
});

describe('ensureOwner', () => {
  let userId = '';
  let gymId = '';

  it('creates the user, the gym and an owner membership', async () => {
    const r = await ensureOwner(admin, {
      email: EMAIL,
      password: 'first-password-1',
      gymName: GYM,
      displayName: 'Chủ gym Test',
    });
    expect(r.created).toBe(true);
    userId = r.userId;
    gymId = r.gymId;
    createdUsers.push(userId);
    createdGyms.push(gymId);

    const { data: m } = await admin.from('members').select('role, gym_id, display_name').eq('user_id', userId);
    expect(m).toEqual([{ role: 'owner', gym_id: gymId, display_name: 'Chủ gym Test' }]);
  });

  it('can sign in with that password and sees only their gym', async () => {
    const c = anon();
    const { error } = await c.auth.signInWithPassword({ email: EMAIL, password: 'first-password-1' });
    expect(error).toBeNull();
    const { data: gyms } = await c.from('gyms').select('id');
    expect(gyms).toEqual([{ id: gymId }]);
  });

  it('is idempotent: running again creates nothing new and keeps the password', async () => {
    const r = await ensureOwner(admin, {
      email: EMAIL,
      password: 'another-password-2',
      gymName: GYM,
      displayName: 'Chủ gym Test',
    });
    expect(r.created).toBe(false);
    expect(r.userId).toBe(userId);
    expect(r.gymId).toBe(gymId);

    const { data: members } = await admin.from('members').select('id').eq('user_id', userId);
    expect(members).toHaveLength(1);
    const { data: gyms } = await admin.from('gyms').select('id').eq('name', GYM);
    expect(gyms).toHaveLength(1);

    // the original password still works: an existing account is not silently re-keyed
    const c = anon();
    const { error } = await c.auth.signInWithPassword({ email: EMAIL, password: 'first-password-1' });
    expect(error).toBeNull();
  });

  it('resets the password only when asked to', async () => {
    await ensureOwner(admin, {
      email: EMAIL,
      password: 'reset-password-3',
      gymName: GYM,
      displayName: 'Chủ gym Test',
      resetPassword: true,
    });
    const ok = await anon().auth.signInWithPassword({ email: EMAIL, password: 'reset-password-3' });
    expect(ok.error).toBeNull();
    const old = await anon().auth.signInWithPassword({ email: EMAIL, password: 'first-password-1' });
    expect(old.error).not.toBeNull();
  });

  it('matches the email case-insensitively', async () => {
    const r = await ensureOwner(admin, {
      email: EMAIL.toUpperCase(),
      password: 'x-password-4',
      gymName: GYM,
      displayName: 'Chủ gym Test',
    });
    expect(r.created).toBe(false);
    expect(r.userId).toBe(userId);
  });

  it('promotes an existing PT account of that email to owner', async () => {
    const ptEmail = `pt.${STAMP}@bootstrap.test`;
    const { data: gym } = await admin.from('gyms').insert({ name: `PT Gym ${STAMP}` }).select('id').single();
    createdGyms.push(gym!.id);
    const { data: u } = await admin.auth.admin.createUser({
      email: ptEmail,
      password: 'pt-password-5',
      email_confirm: true,
    });
    createdUsers.push(u.user!.id);
    await admin
      .from('members')
      .insert({ gym_id: gym!.id, user_id: u.user!.id, display_name: 'PT cũ', role: 'pt' });

    const r = await ensureOwner(admin, {
      email: ptEmail,
      password: 'ignored-password',
      gymName: `PT Gym ${STAMP}`,
      displayName: 'PT cũ',
    });
    expect(r.created).toBe(false);
    const { data: m } = await admin.from('members').select('role').eq('user_id', u.user!.id);
    expect(m).toEqual([{ role: 'owner' }]);
  });

  it('rejects a short password for a new account', async () => {
    await expect(
      ensureOwner(admin, {
        email: `short.${STAMP}@bootstrap.test`,
        password: 'abc',
        gymName: GYM,
        displayName: 'x',
      }),
    ).rejects.toThrow(/8/);
    expect(await userByEmail(`short.${STAMP}@bootstrap.test`)).toBeUndefined();
  });

  it('reuses an existing gym of the same name instead of creating a second one', async () => {
    const email2 = `second.${STAMP}@bootstrap.test`;
    const r = await ensureOwner(admin, {
      email: email2,
      password: 'second-password-6',
      gymName: GYM,
      displayName: 'Chủ thứ hai',
    });
    createdUsers.push(r.userId);
    expect(r.gymId).toBe(gymId);
  });
});

beforeAll(() => {
  // fail fast with a clear message when Supabase is not running
  return admin.from('gyms').select('id').limit(1).then(({ error }) => {
    if (error) throw new Error(`Local Supabase is not reachable: ${error.message}`);
  });
});

describe('create-admin script', () => {
  it('creates the fixed admin non-interactively and can be run twice', async () => {
    const { spawnSync } = await import('node:child_process');
    const email = `cli.${STAMP}@bootstrap.test`;
    const gym = `CLI Gym ${STAMP}`;
    const run = () =>
      spawnSync(
        'npx',
        ['tsx', 'scripts/create-admin.mts', '--gym', gym, '--email', email, '--name', 'Admin CLI'],
        {
          encoding: 'utf8',
          shell: true,
          env: { ...process.env, ADMIN_PASSWORD: 'cli-password-1' },
        },
      );

    const first = run();
    expect(first.status).toBe(0);
    expect(first.stdout).toContain('Đã tạo tài khoản admin');

    const u = await userByEmail(email);
    expect(u).toBeTruthy();
    createdUsers.push(u!.id);
    const { data: m } = await admin.from('members').select('role, gym_id').eq('user_id', u!.id);
    expect(m![0].role).toBe('owner');
    createdGyms.push(m![0].gym_id);

    const second = run();
    expect(second.status).toBe(0);
    expect(second.stdout).toContain('đã tồn tại');

    const login = await anon().auth.signInWithPassword({ email, password: 'cli-password-1' });
    expect(login.error).toBeNull();
  }, 60000);

  it('refuses to run without a gym name or with a short password', async () => {
    const { spawnSync } = await import('node:child_process');
    const noGym = spawnSync('npx', ['tsx', 'scripts/create-admin.mts'], {
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, ADMIN_PASSWORD: 'long-enough-1' },
    });
    expect(noGym.status).toBe(1);
    expect(noGym.stderr).toContain('--gym');

    const short = spawnSync('npx', ['tsx', 'scripts/create-admin.mts', '--gym', 'X'], {
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, ADMIN_PASSWORD: 'abc' },
    });
    expect(short.status).toBe(1);
    expect(short.stderr).toContain('quá ngắn');
  }, 60000);
});

describe('ensureOwner with several centers', () => {
  const email = `multi.${STAMP}@bootstrap.test`;
  const gymA = `Center A ${STAMP}`;
  const gymB = `Center B ${STAMP}`;
  let userId = '';

  it('creates the first center and flags the account as platform admin', async () => {
    const r = await ensureOwner(admin, {
      email,
      password: 'multi-password-1',
      gymName: gymA,
      displayName: 'Admin Đa',
      platformAdmin: true,
    });
    userId = r.userId;
    createdUsers.push(userId);
    createdGyms.push(r.gymId);
    const { data } = await admin.auth.admin.getUserById(userId);
    expect(data.user!.app_metadata.platform_admin).toBe(true);
  });

  it('adds a second center for the same account instead of reusing the first', async () => {
    const r = await ensureOwner(admin, {
      email,
      password: 'ignored-1',
      gymName: gymB,
      displayName: 'Admin Đa',
      platformAdmin: true,
    });
    expect(r.created).toBe(false);
    expect(r.userId).toBe(userId);
    createdGyms.push(r.gymId);

    const { data: m } = await admin.from('members').select('gym_id, role').eq('user_id', userId);
    expect(m).toHaveLength(2);
    expect(new Set(m!.map((x) => x.gym_id)).size).toBe(2);
    expect(m!.every((x) => x.role === 'owner')).toBe(true);
  });

  it('is idempotent per center', async () => {
    await ensureOwner(admin, { email, password: 'x-password-2', gymName: gymB, displayName: 'Admin Đa' });
    const { data: m } = await admin.from('members').select('id').eq('user_id', userId);
    expect(m).toHaveLength(2);
  });

  it('does not remove the platform flag when run without it', async () => {
    await ensureOwner(admin, { email, password: 'x-password-3', gymName: gymA, displayName: 'Admin Đa' });
    const { data } = await admin.auth.admin.getUserById(userId);
    expect(data.user!.app_metadata.platform_admin).toBe(true);
  });

  it('does not make an ordinary owner a platform admin', async () => {
    const plain = `plain.${STAMP}@bootstrap.test`;
    const r = await ensureOwner(admin, {
      email: plain,
      password: 'plain-password-1',
      gymName: gymA,
      displayName: 'Chủ thường',
    });
    createdUsers.push(r.userId);
    const { data } = await admin.auth.admin.getUserById(r.userId);
    expect(data.user!.app_metadata.platform_admin).toBeUndefined();
  });

  it('lets the admin see both centers and a center owner see only one (through the API)', async () => {
    const c = anon();
    await c.auth.signInWithPassword({ email, password: 'multi-password-1' });
    const { data: gyms } = await c.from('gyms').select('id').in('name', [gymA, gymB]);
    expect(gyms).toHaveLength(2);

    const o = anon();
    await o.auth.signInWithPassword({ email: `plain.${STAMP}@bootstrap.test`, password: 'plain-password-1' });
    const { data: mine } = await o.from('gyms').select('id').in('name', [gymA, gymB]);
    expect(mine).toHaveLength(1);
  });
});
