export interface CancelRecord {
  status: string;
  cancelledBy: 'student' | 'pt' | null;
  startAt: Date;
  cancelledAt: Date | null;
}

export const LATE_HOURS = 4;
export const WINDOW_DAYS = 30;

/** Student cancellations made less than 4 hours before the start, within the last 30 days. */
export function lateCancelCount(rows: CancelRecord[], now: Date): number {
  const since = now.getTime() - WINDOW_DAYS * 24 * 3600_000;
  return rows.filter(
    (r) =>
      r.status === 'cancelled' &&
      r.cancelledBy === 'student' &&
      r.cancelledAt !== null &&
      r.cancelledAt.getTime() >= since &&
      r.startAt.getTime() - r.cancelledAt.getTime() < LATE_HOURS * 3600_000,
  ).length;
}
