import { findConflicts } from './conflicts';
import type { AvailabilityWindow, SessionLite } from './types';
import { vnWeekday } from '@/lib/time';

export interface SuggestStudent {
  studentId: string;
  name: string;
  remaining: number;
  targetPerWeek: number;
  /** Non-cancelled sessions this VN week (Mon-Sun), including those already done. */
  sessionsThisWeek: number;
  /** Whole days since the last done session; null when they have never trained. */
  daysSinceLast: number | null;
  availability: AvailabilityWindow[];
}

export interface TomorrowSuggestion {
  studentId: string;
  name: string;
  startAt: Date;
  endAt: Date;
  reason: string;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Pure rule-based proposal for who should train tomorrow and when.
 * `day` is the VN calendar day [start, end); `booked` are the PT's sessions that day
 * (and any other session of their students — cancelled ones are ignored).
 */
export function suggestTomorrow(input: {
  day: { start: Date; end: Date };
  ptId: string;
  students: SuggestStudent[];
  booked: SessionLite[];
  limit?: number;
  durationMin?: number;
}): TomorrowSuggestion[] {
  const { day, ptId, students, booked } = input;
  const limit = input.limit ?? 6;
  const durationMin = input.durationMin ?? 60;
  const weekday = vnWeekday(day.start);

  const alreadyBooked = new Set(
    booked.filter((s) => s.status !== 'cancelled').map((s) => s.studentId),
  );

  const ranked = students
    .map((s) => ({ s, need: s.targetPerWeek - s.sessionsThisWeek }))
    .filter(
      ({ s, need }) =>
        s.remaining > 0 &&
        need > 0 &&
        !alreadyBooked.has(s.studentId) &&
        s.availability.some((w) => w.weekday === weekday),
    )
    .sort(
      (a, b) =>
        b.need - a.need ||
        (b.s.daysSinceLast ?? Number.POSITIVE_INFINITY) -
          (a.s.daysSinceLast ?? Number.POSITIVE_INFINITY),
    );

  const taken: SessionLite[] = [...booked];
  const out: TomorrowSuggestion[] = [];

  for (const { s } of ranked) {
    if (out.length >= limit) break;
    let placed: { startAt: Date; endAt: Date } | null = null;

    for (const w of s.availability.filter((x) => x.weekday === weekday)) {
      const from = Math.ceil(toMinutes(w.from) / 60) * 60; // whole hours only
      const to = toMinutes(w.to);
      for (let m = from; m + durationMin <= to && !placed; m += 60) {
        const startAt = new Date(day.start.getTime() + m * 60000);
        const endAt = new Date(startAt.getTime() + durationMin * 60000);
        if (endAt > day.end) break;
        if (findConflicts({ ptId, studentId: s.studentId, startAt, endAt }, taken).length === 0) {
          placed = { startAt, endAt };
        }
      }
      if (placed) break;
    }
    if (!placed) continue;

    taken.push({
      id: `suggestion-${s.studentId}`,
      ptId,
      studentId: s.studentId,
      packageId: null,
      startAt: placed.startAt,
      endAt: placed.endAt,
      status: 'scheduled',
      studentSigned: false,
      workoutLogged: false,
    });
    const gap = s.daysSinceLast === null ? 'chưa tập lần nào' : `${s.daysSinceLast} ngày chưa tập`;
    out.push({
      studentId: s.studentId,
      name: s.name,
      ...placed,
      reason: `Tuần này ${s.sessionsThisWeek}/${s.targetPerWeek} buổi · ${gap}`,
    });
  }
  return out;
}
