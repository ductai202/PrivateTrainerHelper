import { describe, it, expect } from 'vitest';
import { suggestFillIns } from '@/lib/domain/fillIns';
import type { FillInCandidate } from '@/lib/domain/types';

// slot Thứ 3 17:00–18:00 VN
const slot = { startAt: new Date('2026-10-20T10:00:00Z'), endAt: new Date('2026-10-20T11:00:00Z') };

function cand(id: string, p: Partial<FillInCandidate>): FillInCandidate {
  return {
    studentId: id,
    name: id,
    phone: '0912345678',
    remaining: 5,
    availability: [],
    sessionsOnDay: 0,
    sessionsThisWeek: 0,
    ...p,
  };
}

describe('suggestFillIns', () => {
  it('filters and ranks', () => {
    const win = [{ weekday: 2, from: '16:00', to: '19:00' }];
    const cands = [
      cand('noLeft', { remaining: 0, availability: win }),
      cand('busyToday', { remaining: 5, availability: win, sessionsOnDay: 1 }),
      cand('notFree', { remaining: 5, availability: [{ weekday: 2, from: '17:30', to: '19:00' }] }),
      cand('twoThisWeek', { remaining: 3, availability: win, sessionsThisWeek: 2 }),
      cand('zeroThisWeekLow', { remaining: 2, availability: win }),
      cand('zeroThisWeekHigh', { remaining: 8, availability: win }),
    ];
    expect(suggestFillIns(slot, cands).map((c) => c.studentId)).toEqual([
      'zeroThisWeekHigh',
      'zeroThisWeekLow',
      'twoThisWeek',
    ]);
  });
  it('respects limit', () => {
    const win = [{ weekday: 2, from: '16:00', to: '19:00' }];
    const cands = Array.from({ length: 8 }, (_, i) => cand(`c${i}`, { availability: win }));
    expect(suggestFillIns(slot, cands, 3)).toHaveLength(3);
  });
});
