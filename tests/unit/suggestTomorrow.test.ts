import { describe, it, expect } from 'vitest';
import { suggestTomorrow, type SuggestStudent } from '@/lib/domain/suggestTomorrow';
import { vnHHmm } from '@/lib/time';
import { at, mk } from './helpers';

// 2026-10-20 is a Tuesday (weekday 2). `at()` builds times on that VN day.
const day = { start: at('00:00'), end: new Date(at('00:00').getTime() + 24 * 3600_000) };
const TUE = 2;

function student(id: string, p: Partial<SuggestStudent> = {}): SuggestStudent {
  return {
    studentId: id,
    name: id,
    remaining: 5,
    targetPerWeek: 3,
    sessionsThisWeek: 0,
    daysSinceLast: 5,
    availability: [{ weekday: TUE, from: '08:00', to: '12:00' }],
    ...p,
  };
}

const run = (students: SuggestStudent[], booked = [] as ReturnType<typeof mk>[], extra = {}) =>
  suggestTomorrow({ day, ptId: 'pt', students, booked, ...extra });

describe('suggestTomorrow: who is eligible', () => {
  it('skips students with no sessions left', () => {
    expect(run([student('a', { remaining: 0 })])).toEqual([]);
  });

  it('skips students who already met their weekly target', () => {
    expect(run([student('a', { targetPerWeek: 2, sessionsThisWeek: 2 })])).toEqual([]);
    expect(run([student('a', { targetPerWeek: 2, sessionsThisWeek: 3 })])).toEqual([]);
  });

  it('skips students who are not free on that weekday', () => {
    const wed = [{ weekday: 3, from: '08:00', to: '12:00' }];
    expect(run([student('a', { availability: wed })])).toEqual([]);
    expect(run([student('a', { availability: [] })])).toEqual([]);
  });

  it('skips students who already have a session tomorrow', () => {
    const has = mk({ ptId: 'other-pt', studentId: 'a', startAt: at('15:00'), endAt: at('16:00') });
    expect(run([student('a')], [has])).toEqual([]);
  });

  it('ignores cancelled bookings when deciding who is already booked', () => {
    const gone = mk({ studentId: 'a', startAt: at('09:00'), endAt: at('10:00'), status: 'cancelled' });
    expect(run([student('a')], [gone])).toHaveLength(1);
  });
});

describe('suggestTomorrow: ranking', () => {
  it('puts the student who is furthest behind their target first', () => {
    const out = run([
      student('onTrack', { targetPerWeek: 3, sessionsThisWeek: 2 }),
      student('behind', { targetPerWeek: 3, sessionsThisWeek: 0 }),
    ]);
    expect(out.map((s) => s.studentId)).toEqual(['behind', 'onTrack']);
  });

  it('breaks ties by who has not trained for the longest', () => {
    const out = run([
      student('recent', { daysSinceLast: 1 }),
      student('long', { daysSinceLast: 9 }),
      student('never', { daysSinceLast: null }),
    ]);
    expect(out.map((s) => s.studentId)).toEqual(['never', 'long', 'recent']);
  });

  it('caps the list (default 6, configurable)', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      student(`s${i}`, { availability: [{ weekday: TUE, from: '06:00', to: '21:00' }] }),
    );
    expect(run(many)).toHaveLength(6);
    expect(run(many, [], { limit: 3 })).toHaveLength(3);
  });
});

describe('suggestTomorrow: slots', () => {
  it('uses the first whole hour inside the student window', () => {
    const [s] = run([student('a', { availability: [{ weekday: TUE, from: '08:30', to: '12:00' }] })]);
    expect(vnHHmm(s.startAt)).toBe('09:00');
    expect(vnHHmm(s.endAt)).toBe('10:00');
  });

  it('never overlaps an existing PT booking', () => {
    const busy = mk({ ptId: 'pt', studentId: 'x', startAt: at('08:00'), endAt: at('10:00') });
    const [s] = run([student('a')], [busy]);
    expect(vnHHmm(s.startAt)).toBe('10:00');
  });

  it('does not overlap earlier suggestions either', () => {
    const out = run([
      student('a', { availability: [{ weekday: TUE, from: '08:00', to: '10:00' }] }),
      student('b', { availability: [{ weekday: TUE, from: '08:00', to: '10:00' }] }),
    ]);
    expect(out.map((s) => vnHHmm(s.startAt)).sort()).toEqual(['08:00', '09:00']);
  });

  it('drops a student when their window is fully taken', () => {
    const busy = mk({ ptId: 'pt', studentId: 'x', startAt: at('08:00'), endAt: at('12:00') });
    expect(run([student('a')], [busy])).toEqual([]);
  });

  it('returns nothing when the PT is booked solid', () => {
    const wholeDay = mk({ ptId: 'pt', studentId: 'x', startAt: at('00:00'), endAt: at('23:59') });
    expect(run([student('a')], [wholeDay])).toEqual([]);
  });

  it('needs the window to fit the whole session', () => {
    const tight = student('a', { availability: [{ weekday: TUE, from: '08:00', to: '08:45' }] });
    expect(run([tight])).toEqual([]);
  });
});

describe('suggestTomorrow: reason text', () => {
  it('explains the weekly progress and the gap', () => {
    const [s] = run([student('a', { sessionsThisWeek: 1, targetPerWeek: 3, daysSinceLast: 4 })]);
    expect(s.reason).toBe('Tuần này 1/3 buổi · 4 ngày chưa tập');
  });

  it('says so when the student has never trained', () => {
    const [s] = run([student('a', { daysSinceLast: null })]);
    expect(s.reason).toBe('Tuần này 0/3 buổi · chưa tập lần nào');
  });
});
