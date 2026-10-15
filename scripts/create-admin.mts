// Creates (or repairs) the fixed admin / owner account. Safe to run again.
//
//   npm run create-admin -- --gym "Tên phòng tập"
//   npm run create-admin -- --gym "Tên phòng tập" --env .env.production.local
//   npm run create-admin -- --gym "Tên phòng tập" --reset-password   (đặt lại mật khẩu)
//
// Options: --email (default ductainguyentran@gmail.com), --name (display name), --env <file>
// The password is asked interactively (hidden) and is never stored anywhere.
// For automation only: ADMIN_PASSWORD in the environment skips the prompt.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { ensureOwner } from '../lib/admin/bootstrap.ts';

const DEFAULT_EMAIL = 'ductainguyentran@gmail.com';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function loadEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m) out[m[1]] = m[2];
    }
  } catch {
    // file missing: rely on the process environment
  }
  return out;
}

function askHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    let value = '';
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (c === '') process.exit(130); // Ctrl+C
        if (c === '' || c === '\b') value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on('data', onData);
  });
}

const envFile = arg('env') ?? '.env.local';
const env = { ...loadEnv(envFile), ...process.env } as Record<string, string | undefined>;
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(`Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY (đang đọc ${envFile}).`);
  process.exit(1);
}

const gymName = arg('gym');
if (!gymName) {
  console.error('Thiếu --gym "Tên phòng tập"');
  process.exit(1);
}
const email = arg('email') ?? DEFAULT_EMAIL;

console.log(`Supabase: ${url}`);
console.log(`Admin:    ${email}`);
console.log(`Phòng tập: ${gymName}`);

const fromEnv = process.env.ADMIN_PASSWORD;
const password = fromEnv ?? (await askHidden('Mật khẩu admin (ít nhất 8 ký tự): '));
if (password.length < 8) {
  console.error('Mật khẩu quá ngắn.');
  process.exit(1);
}
if (!fromEnv && !flag('yes')) {
  const again = await askHidden('Nhập lại mật khẩu: ');
  if (again !== password) {
    console.error('Hai mật khẩu không khớp.');
    process.exit(1);
  }
}

const db = createClient(url, key, { auth: { persistSession: false } });
const result = await ensureOwner(db, {
  email,
  password,
  gymName,
  displayName: arg('name') ?? 'Chủ gym',
  resetPassword: flag('reset-password'),
});

console.log(
  result.created
    ? `Đã tạo tài khoản admin ${email}.`
    : flag('reset-password')
      ? `Tài khoản ${email} đã tồn tại, đã đặt lại mật khẩu.`
      : `Tài khoản ${email} đã tồn tại, giữ nguyên mật khẩu (thêm --reset-password nếu muốn đổi).`,
);
console.log('Đăng nhập tại /login rồi vào Quản lý để tạo tài khoản cho các PT.');
process.exitCode = 0; // no process.exit(): lets Node close the connection cleanly
