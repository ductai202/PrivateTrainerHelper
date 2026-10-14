import { createServerSupabase } from '@/lib/supabase/server';
import type { SessionLite, SessionStatus } from '@/lib/domain/types';

export interface SessionRow extends SessionLite {
  studentName: string;
  studentPhone: string;
  ptName: string;
  cancelReason: string | null;
  workoutContent: string | null;
}

type Raw = {
  id: string;
  pt_id: string;
  student_id: string;
  package_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
  student_signed: boolean;
  workout_logged: boolean;
  cancel_reason: string | null;
  workout_content: string | null;
  students: { full_name: string; phone: string } | null;
  members: { display_name: string } | null;
};

export const SESSION_SELECT = `id, pt_id, student_id, package_id, start_at, end_at, status,
  student_signed, workout_logged, cancel_reason, workout_content,
  students(full_name, phone), members!sessions_pt_id_fkey(display_name)`;

export function toSessionRow(r: Raw): SessionRow {
  return {
    id: r.id,
    ptId: r.pt_id,
    studentId: r.student_id,
    packageId: r.package_id,
    startAt: new Date(r.start_at),
    endAt: new Date(r.end_at),
    status: r.status as SessionStatus,
    studentSigned: r.student_signed,
    workoutLogged: r.workout_logged,
    cancelReason: r.cancel_reason,
    workoutContent: r.workout_content,
    studentName: r.students?.full_name ?? '',
    studentPhone: r.students?.phone ?? '',
    ptName: r.members?.display_name ?? '',
  };
}

export async function listSessions(
  range: { start: Date; end: Date },
  ptId?: string,
): Promise<SessionRow[]> {
  const supabase = await createServerSupabase();
  let q = supabase
    .from('sessions')
    .select(SESSION_SELECT)
    .gte('start_at', range.start.toISOString())
    .lt('start_at', range.end.toISOString())
    .order('start_at');
  if (ptId) q = q.eq('pt_id', ptId);
  const { data } = await q;
  return ((data ?? []) as unknown as Raw[]).map(toSessionRow);
}
