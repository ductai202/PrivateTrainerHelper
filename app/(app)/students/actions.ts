'use server';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { normalizeVnPhone } from '@/lib/domain/phone';
import { vnDayRange } from '@/lib/time';

export type FormState = { error?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  return v === '' ? null : Number(v);
};
const todayIso = () => new Date(vnDayRange(new Date()).start.getTime() + 7 * 3600000).toISOString().slice(0, 10);

export async function createStudent(_prev: FormState, form: FormData): Promise<FormState> {
  const member = await getCurrentMember();
  const name = str(form, 'full_name');
  if (!name) return { error: 'Vui lòng nhập tên' };
  const phone = normalizeVnPhone(str(form, 'phone'));
  if (!phone) return { error: 'Số điện thoại không hợp lệ' };

  const supabase = await createServerSupabase();
  const ptId = member.role === 'owner' && str(form, 'pt_id') ? str(form, 'pt_id') : member.id;
  const { data: student, error } = await supabase
    .from('students')
    .insert({
      gym_id: member.gymId,
      pt_id: ptId,
      full_name: name,
      phone,
      birth_year: num(form, 'birth_year'),
      gender: str(form, 'gender') || null,
      height_cm: num(form, 'height_cm'),
      goal: str(form, 'goal') || null,
      health_notes: str(form, 'health_notes') || null,
      target_per_week: Math.min(7, Math.max(1, Math.round(num(form, 'target_per_week') ?? 2))),
    })
    .select('id')
    .single();
  if (error || !student) return { error: 'Không lưu được học viên' };

  const base = { gym_id: member.gymId, student_id: student.id };
  const today = todayIso();

  const m = {
    weight_kg: num(form, 'weight_kg'),
    chest_cm: num(form, 'chest_cm'),
    waist_cm: num(form, 'waist_cm'),
    hip_cm: num(form, 'hip_cm'),
    thigh_cm: num(form, 'thigh_cm'),
    arm_cm: num(form, 'arm_cm'),
  };
  if (Object.values(m).some((v) => v !== null)) {
    await supabase.from('body_measurements').insert({ ...base, measured_on: today, ...m });
  }
  const meal = str(form, 'meal_content');
  if (meal) {
    await supabase.from('meal_plans').insert({ ...base, effective_from: today, content: meal });
  }
  const total = num(form, 'total_sessions');
  if (total && total > 0) {
    await supabase.from('packages').insert({ ...base, total_sessions: total, start_date: today });
  }
  const days = form.getAll('avail_days').map(Number);
  const from = str(form, 'avail_from');
  const to = str(form, 'avail_to');
  if (days.length && from && to && from < to) {
    await supabase
      .from('student_availability')
      .insert(days.map((weekday) => ({ ...base, weekday, from_time: from, to_time: to })));
  }
  redirect(`/students/${student.id}`);
}
