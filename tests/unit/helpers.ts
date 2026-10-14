import type { SessionLite } from '@/lib/domain/types';

let n = 0;
export function mk(p: Partial<SessionLite> = {}): SessionLite {
  n += 1;
  return {
    id: `s${n}`,
    ptId: 'pt',
    studentId: `st${n}`,
    packageId: null,
    startAt: new Date('2026-10-20T01:00:00Z'),
    endAt: new Date('2026-10-20T02:00:00Z'),
    status: 'scheduled',
    studentSigned: false,
    workoutLogged: false,
    ...p,
  };
}

/** HH:mm on 2026-10-20 in VN time */
export function at(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(2026, 9, 20, h - 7, m));
}
