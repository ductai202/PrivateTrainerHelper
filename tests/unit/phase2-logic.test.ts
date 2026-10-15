import { describe, it, expect } from 'vitest';
import { signStudentToken, verifyStudentToken, signSessionToken, verifySessionToken } from '@/lib/links/token';
import { freeSlots } from '@/lib/domain/slots';
import { lateCancelCount } from '@/lib/domain/reliability';
import { suggestFillIns } from '@/lib/domain/fillIns';
import { classifyReply } from '@/lib/zalo/intent';
import { isRateLimited } from '@/lib/zalo/rateLimit';
import { vnHHmm } from '@/lib/time';
import type { FillInCandidate } from '@/lib/domain/types';
import { at, mk } from './helpers';

const SECRET = 'unit-secret';
const SID = 'f5651989-b6ac-4828-bfeb-1cc0483e0cb1';

describe('student personal link token', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  const exp = new Date('2026-11-19T00:00:00Z');

  it('round-trips id and version', () => {
    const t = signStudentToken(SID, 3, exp, SECRET);
    expect(verifyStudentToken(t, SECRET, now)).toEqual({ studentId: SID, version: 3 });
  });

  it('expires', () => {
    const t = signStudentToken(SID, 1, exp, SECRET);
    expect(verifyStudentToken(t, SECRET, new Date('2026-11-19T00:00:01Z'))).toBeNull();
    expect(verifyStudentToken(t, SECRET, new Date('2026-11-18T23:59:59Z'))).not.toBeNull();
  });

  it('rejects tampering and a different secret', () => {
    const t = signStudentToken(SID, 1, exp, SECRET);
    const [p, s] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ id: SID, v: 99, exp: exp.getTime(), k: 's' })).toString('base64url');
    expect(verifyStudentToken(`${forged}.${s}`, SECRET, now)).toBeNull();
    expect(verifyStudentToken(`${p}.${s.slice(0, -2)}xx`, SECRET, now)).toBeNull();
    expect(verifyStudentToken(t, 'other', now)).toBeNull();
    expect(verifyStudentToken('garbage', SECRET, now)).toBeNull();
  });

  it('is not interchangeable with a session token', () => {
    const session = signSessionToken(SID, SECRET);
    expect(verifyStudentToken(session, SECRET, now)).toBeNull();
    const student = signStudentToken(SID, 1, exp, SECRET);
    expect(verifySessionToken(student, SECRET)).toBeNull();
  });
});

describe('freeSlots', () => {
  const day = { start: at('00:00'), end: new Date(at('00:00').getTime() + 24 * 3600_000) };
  const early = new Date(at('00:00').getTime() - 3600_000);
  const hours = (d: Date[]) => d.map(vnHHmm);

  it('offers whole hours between 06:00 and 21:00 when nothing is booked', () => {
    const out = hours(freeSlots({ day, booked: [], now: early }));
    expect(out[0]).toBe('06:00');
    expect(out[out.length - 1]).toBe('20:00');
    expect(out).toHaveLength(15);
  });

  it('removes slots overlapping a booking, including partial overlaps', () => {
    const booked = [mk({ startAt: at('09:30'), endAt: at('10:30') })];
    const out = hours(freeSlots({ day, booked, now: early }));
    expect(out).not.toContain('09:00');
    expect(out).not.toContain('10:00');
    expect(out).toContain('08:00');
    expect(out).toContain('11:00');
  });

  it('ignores cancelled bookings', () => {
    const booked = [mk({ startAt: at('09:00'), endAt: at('10:00'), status: 'cancelled' })];
    expect(hours(freeSlots({ day, booked, now: early }))).toContain('09:00');
  });

  it('drops slots that are already in the past', () => {
    const out = hours(freeSlots({ day, booked: [], now: at('12:30') }));
    expect(out[0]).toBe('13:00');
  });

  it('can be limited to the hours the student is free', () => {
    const out = hours(freeSlots({ day, booked: [], now: early, fromHour: 17, toHour: 19 }));
    expect(out).toEqual(['17:00', '18:00']);
  });
});

describe('lateCancelCount', () => {
  const now = at('12:00');
  const base = { status: 'cancelled' as const, cancelledBy: 'student' as const };
  const hoursBefore = (start: Date, h: number) => new Date(start.getTime() - h * 3600_000);

  it('counts student cancellations made within 4 hours of the start', () => {
    const start = at('10:00');
    const rows = [
      { ...base, startAt: start, cancelledAt: hoursBefore(start, 1) }, // late
      { ...base, startAt: start, cancelledAt: hoursBefore(start, 3.9) }, // late
      { ...base, startAt: start, cancelledAt: hoursBefore(start, 5) }, // early notice
    ];
    expect(lateCancelCount(rows, now)).toBe(1 + 1);
  });

  it('ignores PT cancellations, other statuses and rows without a timestamp', () => {
    const start = at('10:00');
    const rows = [
      { status: 'cancelled' as const, cancelledBy: 'pt' as const, startAt: start, cancelledAt: hoursBefore(start, 1) },
      { status: 'done' as const, cancelledBy: null, startAt: start, cancelledAt: null },
      { ...base, startAt: start, cancelledAt: null },
    ];
    expect(lateCancelCount(rows, now)).toBe(0);
  });

  it('only looks at the last 30 days', () => {
    const old = new Date(now.getTime() - 31 * 24 * 3600_000);
    const rows = [{ ...base, startAt: old, cancelledAt: hoursBefore(old, 1) }];
    expect(lateCancelCount(rows, now)).toBe(0);
  });
});

describe('suggestFillIns ranking with waitlist and reliability', () => {
  // slot Tuesday 17:00-18:00 VN
  const slot = { startAt: new Date('2026-10-20T10:00:00Z'), endAt: new Date('2026-10-20T11:00:00Z') };
  const win = [{ weekday: 2, from: '16:00', to: '19:00' }];
  const cand = (id: string, p: Partial<FillInCandidate>): FillInCandidate => ({
    studentId: id,
    name: id,
    phone: '0912345678',
    remaining: 5,
    availability: win,
    sessionsOnDay: 0,
    sessionsThisWeek: 0,
    ...p,
  });

  it('puts waitlisted students first', () => {
    const out = suggestFillIns(slot, [
      cand('regular', { sessionsThisWeek: 0, remaining: 9 }),
      cand('waiting', { sessionsThisWeek: 2, onWaitlist: true }),
    ]);
    expect(out.map((c) => c.studentId)).toEqual(['waiting', 'regular']);
  });

  it('prefers the student who cancels late less often when otherwise equal', () => {
    const out = suggestFillIns(slot, [
      cand('flaky', { lateCancels: 3 }),
      cand('steady', { lateCancels: 0 }),
    ]);
    expect(out.map((c) => c.studentId)).toEqual(['steady', 'flaky']);
  });

  it('still keeps the previous ordering for candidates without the new fields', () => {
    const out = suggestFillIns(slot, [
      cand('b', { sessionsThisWeek: 2 }),
      cand('a', { sessionsThisWeek: 0 }),
    ]);
    expect(out.map((c) => c.studentId)).toEqual(['a', 'b']);
  });
});

describe('bot replies: busy and stop', () => {
  it.each([
    ['Bận', 'cancel'],
    ['em bận ạ', 'cancel'],
    ['bận rồi', 'cancel'],
    ['busy', 'cancel'],
    ['Bạn ơi cho hỏi', 'unknown'],
    ['bạn khoẻ không', 'unknown'],
    ['stop', 'stop'],
    ['Ngắt kết nối', 'stop'],
    ['dừng', 'stop'],
  ])('%s -> %s', (text, expected) => {
    expect(classifyReply(text)).toBe(expected);
  });
});

describe('isRateLimited', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  const ago = (min: number) => new Date(now.getTime() - min * 60_000);

  it('allows up to 5 attempts in 10 minutes', () => {
    expect(isRateLimited([ago(1), ago(2), ago(3), ago(4)], now)).toBe(false);
    expect(isRateLimited([ago(1), ago(2), ago(3), ago(4), ago(5)], now)).toBe(true);
  });

  it('forgets attempts older than the window', () => {
    expect(isRateLimited([ago(11), ago(12), ago(13), ago(14), ago(15), ago(16)], now)).toBe(false);
  });
});
