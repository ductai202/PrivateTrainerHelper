import { randomInt } from 'node:crypto';

// No 0/O/1/l/I: easy to read out loud or copy from a screen.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function generateTempPassword(length = 12): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
  if (password !== confirm) return 'Hai mật khẩu không khớp';
  return null;
}
