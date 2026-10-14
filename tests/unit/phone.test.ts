import { describe, it, expect } from 'vitest';
import { normalizeVnPhone, zaloLink } from '@/lib/domain/phone';

describe('phone', () => {
  it.each(['0912 345 678', '+84912345678', '84-912-345-678', '(091) 2345678'])('%s', (raw) =>
    expect(normalizeVnPhone(raw)).toBe('0912345678'),
  );
  it.each(['091234567', 'abc', '', '+1 415 555 0100'])('rejects %s', (raw) =>
    expect(normalizeVnPhone(raw)).toBeNull(),
  );
  it('zaloLink', () => {
    expect(zaloLink('+84 912 345 678')).toBe('https://zalo.me/0912345678');
    expect(zaloLink('xyz')).toBeNull();
  });
});
