'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { SESSION_SELECT, toSessionRow } from '@/lib/data/sessions';
import { findConflicts } from '@/lib/domain/conflicts';
import { createServerSupabase } from '@/lib/supabase/server';
import { QUICK_REASONS } from '@/lib/domain/reasons';
import { vnHHmm } from '@/lib/time';

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

/** Convenience wrapper for the one-tap buttons on a session card. */
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

/**
 * Moves a session to another slot in one step: checks the new slot first, then cancels the
 * old one (reason "Đổi giờ", by the student) and creates the new one linked via rescheduled_from.
 */
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

  const durationMs = old.endAt.getTime() - old.startAt.getTime();
  const startAt = new Date(`${date}T${time}:00+07:00`);
  const endAt = new Date(startAt.getTime() + durationMs);
  if (Number.isNaN(startAt.getTime())) return { error: 'Ngày giờ không hợp lệ' };

  const { data: nearby } = await supabase
    .from('sessions')
    .select(SESSION_SELECT)
    .lt('start_at', endAt.toISOString())
    .gt('end_at', startAt.toISOString());
  const rows = ((nearby ?? []) as unknown as Parameters<typeof toSessionRow>[0][]).map(toSessionRow);
  const clash = findConflicts(
    { id: old.id, ptId: old.ptId, studentId: old.studentId, startAt, endAt },
    rows,
  )[0];
  if (clash) {
    const who = rows.find((r) => r.id === clash.id)?.studentName ?? '';
    return { error: `Trùng lịch với ${who} lúc ${vnHHmm(clash.startAt)}–${vnHHmm(clash.endAt)}` };
  }

  const { data: created, error } = await supabase
    .from('sessions')
    .insert({
      gym_id: member.gymId,
      pt_id: old.ptId,
      student_id: old.studentId,
      package_id: old.packageId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      rescheduled_from: old.id,
    })
    .select('id')
    .single();
  if (error || !created) return { error: 'Không tạo được buổi mới' };

  await supabase
    .from('sessions')
    .update({
      status: 'cancelled',
      cancel_reason: QUICK_REASONS.reschedule,
      cancelled_by: 'student',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', old.id);

  revalidatePath('/', 'layout');
  redirect(`/sessions/${created.id}`);
}
