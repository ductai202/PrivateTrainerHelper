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
