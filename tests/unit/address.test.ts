import { describe, it, expect } from 'vitest';
import { addressFor, cap, givenName } from '@/lib/domain/address';

const pt = (gender: string | null, birthYear: number | null) => ({ gender, birthYear });
const st = (gender: string | null, birthYear: number | null, fullName = 'Nguyễn Thị Lan') => ({
  gender,
  birthYear,
  fullName,
});

describe('addressFor', () => {
  it.each([
    // [pt, student, you, me]
    [pt('male', 1995), st('female', 2001), 'em', 'anh'],
    [pt('female', 1990), st('male', 2000), 'em', 'chị'],
    [pt('male', 1998), st('female', 1990), 'chị', 'em'],
    [pt('female', 1998), st('male', 1985), 'anh', 'em'],
    [pt('male', 1995), st('female', 1997), 'bạn', 'mình'], // 2 years: peers
    [pt('male', 1995), st('female', 1993), 'bạn', 'mình'],
    [pt('male', 1995), st('female', 1998), 'em', 'anh'], // 3 years: younger
    [pt('male', 1995), st('male', 1992), 'anh', 'em'], // 3 years: older
  ])('%o + %o -> %s / %s', (p, s, you, me) => {
    const a = addressFor(p, s);
    expect(a.you).toBe(you);
    expect(a.me).toBe(me);
  });

  it('falls back to bạn/mình when an age is missing', () => {
    expect(addressFor(pt('male', null), st('female', 2000))).toMatchObject({ you: 'bạn', me: 'mình' });
    expect(addressFor(pt('male', 1990), st('female', null))).toMatchObject({ you: 'bạn', me: 'mình' });
  });

  it('never guesses a gender it does not know', () => {
    // older student of unknown gender
    expect(addressFor(pt('male', 1998), st(null, 1985))).toMatchObject({ you: 'bạn', me: 'mình' });
    expect(addressFor(pt('male', 1998), st('other', 1985))).toMatchObject({ you: 'bạn', me: 'mình' });
    // younger student but the PT's gender is unknown
    expect(addressFor(pt(null, 1985), st('female', 2000))).toMatchObject({ you: 'bạn', me: 'mình' });
  });

  it('uses the given name', () => {
    expect(addressFor(pt('male', 1995), st('female', 2001)).name).toBe('Lan');
  });
});

describe('givenName / cap', () => {
  it('takes the last word of a Vietnamese full name', () => {
    expect(givenName('Nguyễn Thị Lan')).toBe('Lan');
    expect(givenName('  Minh  ')).toBe('Minh');
    expect(givenName('Trần   Văn  Bảo')).toBe('Bảo');
  });

  it('capitalises the first letter, including Vietnamese letters', () => {
    expect(cap('em')).toBe('Em');
    expect(cap('chị')).toBe('Chị');
    expect(cap('ừ')).toBe('Ừ');
    expect(cap('')).toBe('');
  });
});
