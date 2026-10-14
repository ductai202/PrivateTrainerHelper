import type { SessionLite } from './types';

export function findConflicts(
  candidate: { id?: string; ptId: string; studentId: string; startAt: Date; endAt: Date },
  existing: SessionLite[],
): SessionLite[] {
  return existing.filter(
    (s) =>
      s.status !== 'cancelled' &&
      s.id !== candidate.id &&
      (s.ptId === candidate.ptId || s.studentId === candidate.studentId) &&
      candidate.startAt < s.endAt &&
      s.startAt < candidate.endAt,
  );
}
