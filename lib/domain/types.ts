export type SessionStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'done' | 'no_show';

export interface SessionLite {
  id: string;
  ptId: string;
  studentId: string;
  packageId: string | null;
  startAt: Date;
  endAt: Date;
  status: SessionStatus;
  studentSigned: boolean;
  workoutLogged: boolean;
}

/** weekday: 0 = Sunday … 6 = Saturday (VN time); from/to are 'HH:mm' (VN) */
export interface AvailabilityWindow {
  weekday: number;
  from: string;
  to: string;
}

export interface FillInCandidate {
  studentId: string;
  name: string;
  phone: string;
  remaining: number;
  availability: AvailabilityWindow[];
  sessionsOnDay: number;
  sessionsThisWeek: number;
  /** Waiting for a slot: invited before everyone else. */
  onWaitlist?: boolean;
  /** Student cancellations within 4h of the start, last 30 days. */
  lateCancels?: number;
}

export type ChecklistItem = 'outcome' | 'sign' | 'workout';
