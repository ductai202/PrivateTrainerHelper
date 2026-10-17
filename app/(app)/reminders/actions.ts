'use server';
import { revalidatePath } from 'next/cache';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { SESSION_SELECT, toSessionRow } from '@/lib/data/sessions';
import { findConflicts } from '@/lib/domain/conflicts';
import { createServerSupabase } from '@/lib/supabase/server';

export type BookState = { error?: string } | undefined;

/** Books one of the evening suggestions exactly as proposed (same PT, 60 minutes). */
export async function bookSuggestion(
  studentId: string,
  startIso: string,
  endIso: string,
): Promise<void> {
  await getCurrentMember();
  const startAt = new Date(startIso);
  const endAt = new Date(endIso);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) return;

  const supabase = await createServerSupabase();
  const { data: student } = await supabase
    .from('students')
    .select('id, pt_id, gym_id')
    .eq('id', studentId)
    .maybeSingle();
  if (!student) return;

  // the slot may have been taken since the page was rendered
  const { data: nearby } = await supabase
    .from('sessions')
    .select(SESSION_SELECT)
    .lt('start_at', endAt.toISOString())
    .gt('end_at', startAt.toISOString());
  const rows = ((nearby ?? []) as unknown as Parameters<typeof toSessionRow>[0][]).map(toSessionRow);
  if (findConflicts({ ptId: student.pt_id, studentId, startAt, endAt }, rows).length > 0) {
    revalidatePath('/reminders');
    return;
  }

  const { data: pkg } = await supabase
    .from('packages')
    .select('id')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from('sessions').insert({
    gym_id: student.gym_id,
    pt_id: student.pt_id,
    student_id: studentId,
    package_id: pkg?.id ?? null,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
  });
  revalidatePath('/reminders');
}
