import { describe, it, expect } from 'vitest';
import { parseProfile } from '@/lib/auth/profile';

const now = new Date('2026-10-20T00:00:00Z');

describe('parseProfile', () => {
  it('accepts a full profile', () => {
    expect(parseProfile('male', '1995', now)).toEqual({
      ok: true,
      value: { gender: 'male', birthYear: 1995 },
    });
  });

  it('allows both fields to be empty', () => {
    expect(parseProfile('', '', now)).toEqual({ ok: true, value: { gender: null, birthYear: null } });
  });

  it('rejects an unknown gender', () => {
    expect(parseProfile('x', '1995', now)).toEqual({ ok: false, error: 'Giới tính không hợp lệ' });
  });

  it.each(['abc', '19.5', '1900', '2020', '2013'])('rejects birth year %s', (y) => {
    const r = parseProfile('female', y, now);
    expect(r.ok).toBe(false);
  });

  it('accepts the youngest allowed (14 years old) and trims spaces', () => {
    expect(parseProfile(' female ', ' 2012 ', now)).toEqual({
      ok: true,
      value: { gender: 'female', birthYear: 2012 },
    });
  });
});
