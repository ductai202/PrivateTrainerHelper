import { createServerSupabase } from '@/lib/supabase/server';
import { remainingAcrossPackages } from '@/lib/domain/packages';
import { pendingChecklist } from '@/lib/domain/checklist';
import { suggestTomorrow, type SuggestStudent, type TomorrowSuggestion } from '@/lib/domain/suggestTomorrow';
import type { AvailabilityWindow, SessionLite } from '@/lib/domain/types';
import { listSessions, type SessionRow } from '@/lib/data/sessions';
import { vnDayRange, vnWeekRange } from '@/lib/time';

const DAY_MS = 24 * 3600 * 1000;

export interface EveningPrep {
  tomorrow: { start: Date; end: Date };
  unfinishedToday: SessionRow[];
  tomorrowSessions: SessionRow[];
  suggestions: TomorrowSuggestion[];
  remindedSessionIds: Set<string>;
  waitlist: { studentId: string; name: string; since: Date }[];
  rescheduleRequests: {
    id: string;
    sessionId: string;
    studentName: string;
    requestedStart: Date;
  }[];
}

/** Everything the "Chuẩn bị ngày mai" screen shows, for one PT (owners get no suggestions). */
export async function getEveningPrep(
  member: { id: string; gymId: string; role: 'owner' | 'pt' },
  now = new Date(),
): Promise<EveningPrep> {
  const today = vnDayRange(now);
  const tomorrow = vnDayRange(new Date(today.end.getTime() + 1000));
  const ptFilter = member.role === 'owner' ? undefined : member.id;

  // yesterday's sessions the PT forgot to close still need attention
  const sinceYesterday = { start: new Date(today.start.getTime() - DAY_MS), end: today.end };
  const [todaySessions, tomorrowAll] = await Promise.all([
    listSessions(sinceYesterday, ptFilter),
    listSessions(tomorrow, ptFilter),
  ]);
  const unfinishedToday = todaySessions.filter(
    (s) => s.status !== 'cancelled' && s.startAt < now && (s.endAt <= now ? pendingChecklist(s, now).length > 0 : false),
  );
  const tomorrowSessions = tomorrowAll.filter((s) => s.status !== 'cancelled');

  const supabase = await createServerSupabase();
  const ids = tomorrowSessions.map((s) => s.id);
  const { data: log } = ids.length
    ? await supabase.from('message_log').select('session_id').eq('kind', 'reminder').in('session_id', ids)
    : { data: [] };
  const remindedSessionIds = new Set((log ?? []).map((l) => l.session_id as string));

  let suggestions: TomorrowSuggestion[] = [];
  if (member.role === 'pt') {
    const week = vnWeekRange(tomorrow.start);
    const { data: students } = await supabase
      .from('students')
      .select(
        `id, full_name, target_per_week,
         packages(total_sessions),
         student_availability(weekday, from_time, to_time),
         sessions(status, student_signed, start_at)`,
      )
      .eq('pt_id', member.id)
      .eq('archived', false);

    const suggestStudents: SuggestStudent[] = (students ?? []).map((s) => {
      const sess = s.sessions ?? [];
      const live = sess.filter((x) => x.status !== 'cancelled');
      const inWeek = live.filter((x) => {
        const t = new Date(x.start_at);
        return t >= week.start && t < week.end;
      });
      const lastDone = sess
        .filter((x) => x.status === 'done' && new Date(x.start_at) <= now)
        .map((x) => new Date(x.start_at).getTime())
        .sort((a, b) => b - a)[0];
      const availability: AvailabilityWindow[] = (s.student_availability ?? []).map((w) => ({
        weekday: w.weekday,
        from: w.from_time.slice(0, 5),
        to: w.to_time.slice(0, 5),
      }));
      return {
        studentId: s.id,
        name: s.full_name,
        targetPerWeek: s.target_per_week,
        remaining: remainingAcrossPackages(
          (s.packages ?? []).map((p) => p.total_sessions),
          sess.map((x) => ({ status: x.status, studentSigned: x.student_signed }) as SessionLite),
        ),
        sessionsThisWeek: inWeek.length,
        daysSinceLast:
          lastDone === undefined ? null : Math.max(0, Math.floor((now.getTime() - lastDone) / DAY_MS)),
        availability,
      };
    });

    suggestions = suggestTomorrow({
      day: tomorrow,
      ptId: member.id,
      students: suggestStudents,
      booked: tomorrowAll,
    });
  }

  const [{ data: wl }, { data: rq }] = await Promise.all([
    supabase
      .from('waitlist_entries')
      .select('student_id, created_at, students(full_name)')
      .eq('gym_id', member.gymId)
      .eq('active', true)
      .order('created_at'),
    supabase
      .from('reschedule_requests')
      .select('id, session_id, requested_start, students(full_name)')
      .eq('gym_id', member.gymId)
      .eq('status', 'pending')
      .order('created_at'),
  ]);
  const waitlist = (wl ?? []).map((w) => ({
    studentId: w.student_id,
    name: (w.students as { full_name: string } | null)?.full_name ?? '',
    since: new Date(w.created_at),
  }));
  const rescheduleRequests = (rq ?? []).map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    studentName: (r.students as { full_name: string } | null)?.full_name ?? '',
    requestedStart: new Date(r.requested_start),
  }));

  return {
    tomorrow,
    unfinishedToday,
    tomorrowSessions,
    suggestions,
    remindedSessionIds,
    waitlist,
    rescheduleRequests,
  };
}
