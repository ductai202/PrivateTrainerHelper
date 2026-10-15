'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { moveSession } from '@/lib/data/moveSession';
import { SESSION_SELECT, toSessionRow } from '@/lib/data/sessions';
import { QUICK_REASONS } from '@/lib/domain/reasons';
import { createServerSupabase } from '@/lib/supabase/server';

export type RescheduleState = { error?: string } | undefined;

const OPEN = ['scheduled', 'confirmed'];

/** The student told the PT (usually over Zalo) that they cannot come. Never consumes a session. */
export async function studentCancelled(sessionId: string, reason: string) {
  await getCurrentMember();
  const supabase = await createServerSupabase();
  await supabase
    .from('sessions')
    .update({
      status: 'cancelled',
      cancel_reason: reason || QUICK_REASONS.busy,
      cancelled_by: 'student',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .in('status', OPEN);
  revalidatePath('/', 'layout');
  redirect(`/sessions/${sessionId}`);
}

/** Convenience wrappers for the one-tap buttons on a session card. */
export async function studentBusy(sessionId: string) {
  return studentCancelled(sessionId, QUICK_REASONS.busy);
}

export async function studentSick(sessionId: string) {
  return studentCancelled(sessionId, QUICK_REASONS.sick);
}

export async function confirmSession(sessionId: string) {
  await getCurrentMember();
  const supabase = await createServerSupabase();
  await supabase.from('sessions').update({ status: 'confirmed' }).eq('id', sessionId).eq('status', 'scheduled');
  revalidatePath('/', 'layout');
}

/** Undo a cancellation made by mistake. */
export async function reopenSession(sessionId: string) {
  await getCurrentMember();
  const supabase = await createServerSupabase();
  await supabase
    .from('sessions')
    .update({ status: 'scheduled', cancel_reason: null, cancelled_by: null, cancelled_at: null })
    .eq('id', sessionId)
    .eq('status', 'cancelled');
  revalidatePath('/', 'layout');
}

/** PT typed a new slot for a session ("Đổi giờ"). */
export async function rescheduleSession(
  sessionId: string,
  _prev: RescheduleState,
  form: FormData,
): Promise<RescheduleState> {
  const member = await getCurrentMember();
  const date = String(form.get('date') ?? '');
  const time = String(form.get('time') ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return { error: 'Vui lòng nhập ngày và giờ mới' };
  }

  const supabase = await createServerSupabase();
  const { data: raw } = await supabase.from('sessions').select(SESSION_SELECT).eq('id', sessionId).maybeSingle();
  if (!raw) return { error: 'Không tìm thấy buổi tập' };
  const old = toSessionRow(raw as unknown as Parameters<typeof toSessionRow>[0]);
  if (!OPEN.includes(old.status)) return { error: 'Buổi này không còn đổi giờ được' };

  const startAt = new Date(`${date}T${time}:00+07:00`);
  if (Number.isNaN(startAt.getTime())) return { error: 'Ngày giờ không hợp lệ' };
  const endAt = new Date(startAt.getTime() + (old.endAt.getTime() - old.startAt.getTime()));

  const moved = await moveSession(supabase, member.gymId, old, startAt, endAt, QUICK_REASONS.reschedule);
  if ('error' in moved) return { error: moved.error };
  revalidatePath('/', 'layout');
  redirect(`/sessions/${moved.id}`);
}

/** PT accepts a reschedule request made by the student through their personal link. */
export async function approveReschedule(
  requestId: string,
  _prev: RescheduleState,
): Promise<RescheduleState> {
  const member = await getCurrentMember();
  const supabase = await createServerSupabase();
  const { data: req } = await supabase
    .from('reschedule_requests')
    .select('id, session_id, requested_start, requested_end, status')
    .eq('id', requestId)
    .maybeSingle();
  if (!req || req.status !== 'pending') return { error: 'Yêu cầu này đã được xử lý' };

  const { data: raw } = await supabase.from('sessions').select(SESSION_SELECT).eq('id', req.session_id).maybeSingle();
  if (!raw) return { error: 'Không tìm thấy buổi tập' };
  const old = toSessionRow(raw as unknown as Parameters<typeof toSessionRow>[0]);
  if (!OPEN.includes(old.status)) return { error: 'Buổi này không còn đổi giờ được' };

  const moved = await moveSession(
    supabase,
    member.gymId,
    old,
    new Date(req.requested_start),
    new Date(req.requested_end),
    QUICK_REASONS.reschedule,
  );
  if ('error' in moved) return { error: moved.error };

  await supabase
    .from('reschedule_requests')
    .update({ status: 'approved', decided_at: new Date().toISOString() })
    .eq('id', requestId);
  revalidatePath('/', 'layout');
  redirect(`/sessions/${moved.id}`);
}

export async function declineReschedule(requestId: string) {
  await getCurrentMember();
  const supabase = await createServerSupabase();
  await supabase
    .from('reschedule_requests')
    .update({ status: 'declined', decided_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending');
  revalidatePath('/', 'layout');
}

/** Kills the student's link for this one session (it keeps working for other sessions). */
export async function revokeSessionLink(sessionId: string) {
  await getCurrentMember();
  const supabase = await createServerSupabase();
  await supabase
    .from('sessions')
    .update({ link_revoked_at: new Date().toISOString() })
    .eq('id', sessionId);
  revalidatePath('/', 'layout');
}
