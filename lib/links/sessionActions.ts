import { createAdminSupabase } from '@/lib/supabase/admin';
import { sendPush } from '@/lib/push/send';
import { vnDateLabel, vnHHmm } from '@/lib/time';

export type ActionResult = 'confirmed' | 'cancelled' | 'not_allowed';

/** Acts on a session on behalf of the student (link or bot). Bypasses RLS: callers must authenticate. */
export async function studentRespond(
  sessionId: string,
  action: 'confirm' | 'cancel',
  reason: string,
): Promise<ActionResult> {
  const db = createAdminSupabase();
  const { data: s } = await db
    .from('sessions')
    .select('id, pt_id, status, start_at, students(full_name)')
    .eq('id', sessionId)
    .maybeSingle();
  if (!s) return 'not_allowed';
  const open = s.status === 'scheduled' || s.status === 'confirmed';
  if (!open || new Date(s.start_at) <= new Date()) return 'not_allowed';

  const name = (s.students as { full_name: string } | null)?.full_name ?? 'Học viên';
  const when = `${vnHHmm(new Date(s.start_at))} ${vnDateLabel(new Date(s.start_at))}`;

  if (action === 'confirm') {
    if (s.status === 'confirmed') return 'confirmed';
    await db
      .from('sessions')
      .update({ status: 'confirmed' })
      .eq('id', sessionId)
      .in('status', ['scheduled']);
    await sendPush(s.pt_id, { title: `${name} đã xác nhận`, body: when, url: `/sessions/${sessionId}` });
    return 'confirmed';
  }
  await db
    .from('sessions')
    .update({ status: 'cancelled', cancel_reason: reason || 'Học viên huỷ qua tin nhắn' })
    .eq('id', sessionId)
    .in('status', ['scheduled', 'confirmed']);
  await sendPush(s.pt_id, {
    title: `${name} huỷ buổi`,
    body: `${when} — mở để xem gợi ý lấp slot`,
    url: `/sessions/${sessionId}`,
  });
  return 'cancelled';
}
