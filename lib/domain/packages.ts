import type { SessionLite } from './types';

/** Only sessions that are `done` AND signed by the student consume the package. */
export function remainingSessions(
  totalSessions: number,
  packageId: string,
  sessions: SessionLite[],
): number {
  const used = sessions.filter(
    (s) => s.packageId === packageId && s.status === 'done' && s.studentSigned,
  ).length;
  return totalSessions - used;
}

/**
 * A student's balance across ALL packages: every package total minus every done+signed session,
 * regardless of which package the session was booked against (renewals mid-schedule stay correct).
 */
export function remainingAcrossPackages(totals: number[], sessions: SessionLite[]): number {
  const used = sessions.filter((s) => s.status === 'done' && s.studentSigned).length;
  return totals.reduce((a, b) => a + b, 0) - used;
}
