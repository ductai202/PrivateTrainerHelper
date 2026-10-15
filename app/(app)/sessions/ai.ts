'use server';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { aiConfigured, formatWorkoutPlan, suggestWorkout } from '@/lib/ai/suggestWorkout';
import { createServerSupabase } from '@/lib/supabase/server';

export type DraftResult = { text: string; error?: undefined } | { error: string; text?: undefined };

/**
 * Drafts a workout for one session. Reads everything through the caller's own RLS client,
 * so a PT can only draft for sessions (and students) they are allowed to see.
 */
export async function generateWorkoutDraft(sessionId: string): Promise<DraftResult> {
  await getCurrentMember();
  if (!aiConfigured()) return { error: 'AI chưa được cấu hình' };

  const supabase = await createServerSupabase();
  const { data: session } = await supabase
    .from('sessions')
    .select('id, student_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) return { error: 'Không tìm thấy buổi tập' };

  const [{ data: student }, { data: meas }, { data: past }] = await Promise.all([
    supabase
      .from('students')
      .select('full_name, gender, birth_year, height_cm, goal, health_notes')
      .eq('id', session.student_id)
      .single(),
    supabase
      .from('body_measurements')
      .select('measured_on, weight_kg, waist_cm')
      .eq('student_id', session.student_id)
      .order('measured_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(2),
    supabase
      .from('sessions')
      .select('workout_content, start_at')
      .eq('student_id', session.student_id)
      .neq('id', sessionId)
      .not('workout_content', 'is', null)
      .order('start_at', { ascending: false })
      .limit(3),
  ]);
  if (!student) return { error: 'Không tìm thấy học viên' };

  const gender = student.gender === 'male' || student.gender === 'female' || student.gender === 'other'
    ? student.gender
    : null;
  const result = await suggestWorkout({
    fullName: student.full_name,
    gender,
    age: student.birth_year ? new Date().getFullYear() - student.birth_year : null,
    heightCm: student.height_cm === null ? null : Number(student.height_cm),
    goal: student.goal,
    healthNotes: student.health_notes,
    measurements: (meas ?? []).map((m) => ({
      date: m.measured_on,
      weightKg: m.weight_kg === null ? null : Number(m.weight_kg),
      waistCm: m.waist_cm === null ? null : Number(m.waist_cm),
    })),
    recentWorkouts: (past ?? []).map((p) => p.workout_content as string),
  });
  if (!result.ok) return { error: result.error };
  return { text: formatWorkoutPlan(result.plan) };
}
