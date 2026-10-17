import { createAdminSupabase } from '@/lib/supabase/admin';
import { notifyMember } from '@/lib/notify';
import { linkSecret, verifyStudentToken } from '@/lib/links/token';
import { freeSlots } from '@/lib/domain/slots';
import { remainingAcrossPackages } from '@/lib/domain/packages';
import type { SessionLite, SessionStatus } from '@/lib/domain/types';
import { vnDateLabel, vnDayRange, vnHHmm } from '@/lib/time';

const DAY_MS = 24 * 3600_000;
const SLOT_DAYS = 3;

export interface PortalStudent {
  id: string;
  gym_id: string;
  pt_id: string;
  full_name: string;
}

/** The student a personal link belongs to, or null when it is invalid, expired or revoked. */
export async function resolveStudent(token: string): Promise<PortalStudent | null> {
  const secret = linkSecret();
  if (!secret) return null;
  const v = verifyStudentToken(token, secret);
  if (!v) return null;
  const db = createAdminSupabase();
  const { data: s } = await db
    .from('students')
    .select('id, gym_id, pt_id, full_name, link_version, archived')
    .eq('id', v.studentId)
    .maybeSingle();
  if (!s || s.archived || s.link_version !== v.version) return null;
  return { id: s.id, gym_id: s.gym_id, pt_id: s.pt_id, full_name: s.full_name };
}

type RawSession = {
  id: string;
  pt_id: string;
  student_id: string;
  package_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
  student_signed: boolean;
  workout_logged: boolean;
};

const toLite = (r: RawSession): SessionLite => ({
  id: r.id,
  ptId: r.pt_id,
  studentId: r.student_id,
  packageId: r.package_id,
  startAt: new Date(r.start_at),
  endAt: new Date(r.end_at),
  status: r.status as SessionStatus,
  studentSigned: r.student_signed,
  workoutLogged: r.workout_logged,
});

const LITE_COLUMNS =
  'id, pt_id, student_id, package_id, start_at, end_at, status, student_signed, workout_logged';

/** Free whole-hour slots (PT and student both free) over the next 3 VN days, minus the current slot. */
export async function slotsFor(
  student: { id: string; pt_id: string },
  session: { id: string; start_at: string; end_at: string },
  now = new Date(),
): Promise<Date[]> {
  const db = createAdminSupabase();
  const first = vnDayRange(now).start;
  const until = new Date(first.getTime() + SLOT_DAYS * DAY_MS);
  const { data } = await db
    .from('sessions')
    .select(LITE_COLUMNS)
    .or(`pt_id.eq.${student.pt_id},student_id.eq.${student.id}`)
    .lt('start_at', until.toISOString())
    .gt('end_at', first.toISOString());
  const booked = ((data ?? []) as RawSession[]).filter((r) => r.id !== session.id).map(toLite);

  const durationMin = (new Date(session.end_at).getTime() - new Date(session.start_at).getTime()) / 60_000;
  const currentStart = new Date(session.start_at).getTime();
  const out: Date[] = [];
  for (let i = 0; i < SLOT_DAYS; i += 1) {
    const start = new Date(first.getTime() + i * DAY_MS);
    const day = { start, end: new Date(start.getTime() + DAY_MS) };
    out.push(...freeSlots({ day, booked, now, durationMin }));
  }
  return out.filter((d) => d.getTime() !== currentStart);
}

export interface RescheduleOutcome {
  status: 200 | 401 | 404 | 409;
  error?: string;
}

export async function requestReschedule(
  token: string,
  sessionId: string,
  startIso: string,
  now = new Date(),
  origin?: string,
): Promise<RescheduleOutcome> {
  const student = await resolveStudent(token);
  if (!student) return { status: 401, error: 'Liên kết không hợp lệ hoặc đã hết hạn.' };

  const db = createAdminSupabase();
  const { data: s } = await db
    .from('sessions')
    .select('id, start_at, end_at, status, pt_id')
    .eq('id', sessionId)
    .eq('student_id', student.id)
    .maybeSingle();
  if (!s) return { status: 404, error: 'Không tìm thấy buổi tập' };
  const open = s.status === 'scheduled' || s.status === 'confirmed';
  if (!open || new Date(s.start_at) <= now) {
    return { status: 409, error: 'Buổi này không còn đổi giờ được' };
  }

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return { status: 409, error: 'Giờ không hợp lệ' };
  const slots = await slotsFor(student, s, now);
  if (!slots.some((d) => d.getTime() === start.getTime())) {
    return { status: 409, error: 'Giờ này vừa có người đặt, hãy chọn giờ khác' };
  }
  const end = new Date(start.getTime() + (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()));

  // one open request per session: a new one replaces the previous
  await db
    .from('reschedule_requests')
    .update({ status: 'declined', decided_at: now.toISOString() })
    .eq('session_id', s.id)
    .eq('status', 'pending');
  const { error } = await db.from('reschedule_requests').insert({
    gym_id: student.gym_id,
    session_id: s.id,
    student_id: student.id,
    requested_start: start.toISOString(),
    requested_end: end.toISOString(),
  });
  if (error) return { status: 409, error: 'Không gửi được yêu cầu' };

  await notifyMember(
    s.pt_id,
    {
      title: `${student.full_name} xin đổi giờ`,
      body: `Sang ${vnHHmm(start)} ${vnDateLabel(start)}`,
      url: `/sessions/${s.id}`,
    },
    { origin },
  );
  return { status: 200 };
}

export interface PortalView {
  student: PortalStudent;
  remaining: number | null;
  upcoming: {
    id: string;
    startAt: Date;
    endAt: Date;
    status: string;
    request: { status: string; requestedStart: Date } | null;
    slots: Date[];
  }[];
  availability: { weekday: number; from: string; to: string }[];
  onWaitlist: boolean;
  /** Read-only details about the student, shown to the student themself. */
  info: {
    goal: string | null;
    meal: { content: string; calories: number | null; since: string } | null;
    /** Newest first. */
    measurements: { date: string; weightKg: number | null; waistCm: number | null; hipCm: number | null }[];
    workouts: { date: Date; content: string }[];
  };
}

export async function loadPortal(student: PortalStudent, now = new Date()): Promise<PortalView> {
  const db = createAdminSupabase();
  const [{ data: pkgs }, { data: sessions }, { data: av }, { data: wl }, { data: profile }, { data: meals }, { data: meas }, { data: done }] = await Promise.all([
    db.from('packages').select('total_sessions').eq('student_id', student.id),
    db.from('sessions').select(LITE_COLUMNS).eq('student_id', student.id),
    db.from('student_availability').select('weekday, from_time, to_time').eq('student_id', student.id),
    db.from('waitlist_entries').select('id').eq('student_id', student.id).eq('active', true),
    db.from('students').select('goal').eq('id', student.id).single(),
    db
      .from('meal_plans')
      .select('content, calories, effective_from')
      .eq('student_id', student.id)
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1),
    db
      .from('body_measurements')
      .select('measured_on, weight_kg, waist_cm, hip_cm')
      .eq('student_id', student.id)
      .order('measured_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8),
    db
      .from('sessions')
      .select('start_at, workout_content')
      .eq('student_id', student.id)
      .not('workout_content', 'is', null)
      .order('start_at', { ascending: false })
      .limit(3),
  ]);

  const all = ((sessions ?? []) as RawSession[]).map(toLite);
  const upcomingRaw = all
    .filter((s) => (s.status === 'scheduled' || s.status === 'confirmed') && s.startAt > now)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const ids = upcomingRaw.map((s) => s.id);
  const { data: reqs } = ids.length
    ? await db
        .from('reschedule_requests')
        .select('session_id, status, requested_start, created_at')
        .in('session_id', ids)
        .order('created_at', { ascending: false })
    : { data: [] };

  const upcoming = [];
  for (const s of upcomingRaw) {
    const latest = (reqs ?? []).find((r) => r.session_id === s.id);
    upcoming.push({
      id: s.id,
      startAt: s.startAt,
      endAt: s.endAt,
      status: s.status,
      request: latest ? { status: latest.status, requestedStart: new Date(latest.requested_start) } : null,
      slots: await slotsFor(
        student,
        { id: s.id, start_at: s.startAt.toISOString(), end_at: s.endAt.toISOString() },
        now,
      ),
    });
  }

  return {
    student,
    remaining:
      (pkgs ?? []).length === 0
        ? null
        : remainingAcrossPackages(
            (pkgs ?? []).map((p) => p.total_sessions),
            all,
          ),
    upcoming,
    availability: (av ?? []).map((w) => ({
      weekday: w.weekday,
      from: w.from_time.slice(0, 5),
      to: w.to_time.slice(0, 5),
    })),
    onWaitlist: (wl ?? []).length > 0,
    info: {
      goal: profile?.goal ?? null,
      meal: meals?.[0]
        ? { content: meals[0].content, calories: meals[0].calories, since: meals[0].effective_from }
        : null,
      measurements: (meas ?? []).map((m) => ({
        date: m.measured_on,
        weightKg: m.weight_kg === null ? null : Number(m.weight_kg),
        waistCm: m.waist_cm === null ? null : Number(m.waist_cm),
        hipCm: m.hip_cm === null ? null : Number(m.hip_cm),
      })),
      workouts: (done ?? []).map((w) => ({ date: new Date(w.start_at), content: w.workout_content as string })),
    },
  };
}
