import { createServerSupabase } from '@/lib/supabase/server';
import { remainingAcrossPackages } from '@/lib/domain/packages';
import type { AvailabilityWindow, FillInCandidate, SessionLite } from '@/lib/domain/types';
import { vnDayRange, vnWeekRange } from '@/lib/time';

/** Same-PT students (other than the session's own) with the numbers `suggestFillIns` ranks on. */
export async function getFillInCandidates(
  sessionId: string,
  slot: { ptId: string; studentId: string; startAt: Date },
): Promise<FillInCandidate[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('students')
    .select(
      `id, full_name, phone,
       packages(id, total_sessions, created_at),
       student_availability(weekday, from_time, to_time),
       sessions(id, package_id, status, student_signed, start_at)`,
    )
    .eq('pt_id', slot.ptId)
    .eq('archived', false)
    .neq('id', slot.studentId);

  const day = vnDayRange(slot.startAt);
  const week = vnWeekRange(slot.startAt);
  const inRange = (iso: string, r: { start: Date; end: Date }) => {
    const t = new Date(iso);
    return t >= r.start && t < r.end;
  };

  return (data ?? []).map((s) => {
    const pkg = [...(s.packages ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const sessions = (s.sessions ?? []).filter((x) => x.id !== sessionId);
    const lite = sessions.map(
      (x) =>
        ({ packageId: x.package_id, status: x.status, studentSigned: x.student_signed }) as SessionLite,
    );
    const live = sessions.filter((x) => x.status !== 'cancelled');
    const availability: AvailabilityWindow[] = (s.student_availability ?? []).map((w) => ({
      weekday: w.weekday,
      from: w.from_time.slice(0, 5),
      to: w.to_time.slice(0, 5),
    }));
    return {
      studentId: s.id,
      name: s.full_name,
      phone: s.phone,
      remaining: pkg ? remainingAcrossPackages((s.packages ?? []).map((p) => p.total_sessions), lite) : 0,
      availability,
      sessionsOnDay: live.filter((x) => inRange(x.start_at, day)).length,
      sessionsThisWeek: live.filter((x) => inRange(x.start_at, week)).length,
    };
  });
}
