'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { findConflicts } from '@/lib/domain/conflicts';
import { toSessionRow, SESSION_SELECT } from '@/lib/data/sessions';
import { vnDayRange, vnHHmm } from '@/lib/time';

export type FormState = { error?: string } | undefined;

export async function createSession(_prev: FormState, form: FormData): Promise<FormState> {
  const member = await getCurrentMember();
  const studentId = String(form.get('student_id') ?? '');
  const date = String(form.get('date') ?? '');
  const time = String(form.get('time') ?? '');
  const minutes = Number(form.get('minutes') ?? 60);
  if (!studentId) return { error: 'Vui lòng chọn học viên' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return { error: 'Vui lòng nhập ngày và giờ' };
  }
  if (!(minutes > 0)) return { error: 'Thời lượng không hợp lệ' };

  const startAt = new Date(`${date}T${time}:00+07:00`);
  const endAt = new Date(startAt.getTime() + minutes * 60000);

  const supabase = await createServerSupabase();
  const { data: student } = await supabase
    .from('students')
    .select('id, pt_id')
    .eq('id', studentId)
    .maybeSingle();
  if (!student) return { error: 'Không tìm thấy học viên' };
  const ptId = student.pt_id;

  // conflicts: any non-cancelled session of the same PT or student overlapping the window
  // (also catches sessions that started before midnight and run past it)
  const day = vnDayRange(startAt);
  const { data: existing } = await supabase
    .from('sessions')
    .select(SESSION_SELECT)
    .lt('start_at', endAt.toISOString())
    .gt('end_at', startAt.toISOString());
  const rows = ((existing ?? []) as unknown as Parameters<typeof toSessionRow>[0][]).map(toSessionRow);
  const clash = findConflicts({ ptId, studentId, startAt, endAt }, rows)[0];
  if (clash) {
    const who = rows.find((r) => r.id === clash.id)?.studentName ?? '';
    return { error: `Trùng lịch với ${who} lúc ${vnHHmm(clash.startAt)}–${vnHHmm(clash.endAt)}` };
  }

  const { data: pkg } = await supabase
    .from('packages')
    .select('id')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from('sessions').insert({
    gym_id: member.gymId,
    pt_id: ptId,
    student_id: studentId,
    package_id: pkg?.id ?? null,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
  });
  if (error) return { error: 'Không tạo được buổi' };

  const sameDay = vnDayRange(new Date()).start.getTime() === day.start.getTime();
  redirect(sameDay ? '/today' : '/week');
}

export async function markOutcome(sessionId: string, status: 'done' | 'no_show' | 'scheduled') {
  await getCurrentMember();
  const supabase = await createServerSupabase();
  await supabase.from('sessions').update({ status }).eq('id', sessionId);
  revalidatePath('/', 'layout');
}

export async function setSigned(sessionId: string, signed: boolean) {
  await getCurrentMember();
  const supabase = await createServerSupabase();
  await supabase
    .from('sessions')
    .update({ student_signed: signed, signed_at: signed ? new Date().toISOString() : null })
    .eq('id', sessionId);
  revalidatePath('/', 'layout');
}

export async function saveWorkout(sessionId: string, content: string | null) {
  await getCurrentMember();
  const supabase = await createServerSupabase();
  await supabase
    .from('sessions')
    .update({ workout_logged: true, workout_content: content && content.trim() ? content.trim() : null })
    .eq('id', sessionId);
  revalidatePath('/', 'layout');
}

export async function cancelSession(sessionId: string, reason: string) {
  await getCurrentMember();
  const supabase = await createServerSupabase();
  await supabase
    .from('sessions')
    .update({ status: 'cancelled', cancel_reason: reason || null })
    .eq('id', sessionId);
  revalidatePath('/', 'layout');
}

export async function logMessage(p: {
  sessionId?: string;
  studentId: string;
  kind: 'reminder' | 'fill_in';
  content: string;
}) {
  const member = await getCurrentMember();
  const supabase = await createServerSupabase();
  await supabase.from('message_log').insert({
    gym_id: member.gymId,
    session_id: p.sessionId ?? null,
    student_id: p.studentId,
    channel: 'manual',
    kind: p.kind,
    content: p.content,
  });
}

