import { vnHHmm, vnWeekday } from '@/lib/time';
import type { FillInCandidate } from './types';

export function suggestFillIns(
  slot: { startAt: Date; endAt: Date },
  candidates: FillInCandidate[],
  limit = 5,
): FillInCandidate[] {
  const weekday = vnWeekday(slot.startAt);
  const from = vnHHmm(slot.startAt);
  const to = vnHHmm(slot.endAt);
  return candidates
    .filter(
      (c) =>
        c.remaining > 0 &&
        c.sessionsOnDay === 0 &&
        c.availability.some((w) => w.weekday === weekday && w.from <= from && w.to >= to),
    )
    .sort((a, b) => a.sessionsThisWeek - b.sessionsThisWeek || b.remaining - a.remaining)
    .slice(0, limit);
}
