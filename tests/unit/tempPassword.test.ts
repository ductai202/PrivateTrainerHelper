import { describe, it, expect } from 'vitest';
import { generateTempPassword, validateNewPassword } from '@/lib/auth/password';

describe('generateTempPassword', () => {
  it('is 12 chars from an unambiguous alphabet', () => {
    const p = generateTempPassword();
    expect(p).toHaveLength(12);
    expect(p).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/);
  });
  it('is different on every call', () => {
    const set = new Set(Array.from({ length: 50 }, () => generateTempPassword()));
    expect(set.size).toBe(50);
  });
});

describe('validateNewPassword', () => {
  it('accepts matching passwords of 8+ chars', () => {
    expect(validateNewPassword('abcdefgh', 'abcdefgh')).toBeNull();
  });
  it('rejects short passwords', () => {
    expect(validateNewPassword('abc', 'abc')).toBe('Mật khẩu phải có ít nhất 8 ký tự');
  });
  it('rejects mismatch', () => {
    expect(validateNewPassword('abcdefgh', 'abcdefgx')).toBe('Hai mật khẩu không khớp');
  });
});
