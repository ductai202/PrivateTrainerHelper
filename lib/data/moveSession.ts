import type { SupabaseClient } from '@supabase/supabase-js';
import { SESSION_SELECT, toSessionRow, type SessionRow } from '@/lib/data/sessions';
import { findConflicts } from '@/lib/domain/conflicts';
import { vnHHmm } from '@/lib/time';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Moves a session to a new slot: checks the slot, creates the replacement (linked through
 * `rescheduled_from`) and only then cancels the old one, so a failure never loses a booking.
 * Works with either the caller's RLS client or the service-role client.
 */
export async function moveSession(
  db: SupabaseClient<Database>,
  old: SessionRow,
  startAt: Date,
  endAt: Date,
  reason: string,
): Promise<{ error: string } | { id: string }> {
  const { data: nearby } = await db
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

  const { data: owner } = await db.from('students').select('gym_id').eq('id', old.studentId).single();
  if (!owner) return { error: 'Không tìm thấy học viên' };

  const { data: created, error } = await db
    .from('sessions')
    .insert({
      gym_id: owner.gym_id,
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

  await db
    .from('sessions')
    .update({
      status: 'cancelled',
      cancel_reason: reason,
      cancelled_by: 'student',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', old.id);
  return { id: created.id };
}
