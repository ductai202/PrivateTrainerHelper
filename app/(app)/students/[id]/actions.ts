'use server';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { vnDayRange } from '@/lib/time';

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  return v === '' ? null : Number(v);
};
const todayIso = () =>
  new Date(vnDayRange(new Date()).start.getTime() + 7 * 3600000).toISOString().slice(0, 10);

export async function updateStudentProfile(studentId: string, form: FormData) {
  await getCurrentMember();
  const supabase = await createServerSupabase();
  await supabase
    .from('students')
    .update({
      goal: str(form, 'goal') || null,
      health_notes: str(form, 'health_notes') || null,
      height_cm: num(form, 'height_cm'),
      target_per_week: Math.min(7, Math.max(1, Math.round(num(form, 'target_per_week') ?? 2))),
    })
    .eq('id', studentId);
  revalidatePath(`/students/${studentId}`);
}

export async function addMeasurement(studentId: string, form: FormData) {
  const member = await getCurrentMember();
  const supabase = await createServerSupabase();
  const m = {
    weight_kg: num(form, 'weight_kg'),
    chest_cm: num(form, 'chest_cm'),
    waist_cm: num(form, 'waist_cm'),
    hip_cm: num(form, 'hip_cm'),
    thigh_cm: num(form, 'thigh_cm'),
    arm_cm: num(form, 'arm_cm'),
    body_fat_pct: num(form, 'body_fat_pct'),
  };
  const base = { gym_id: member.gymId, student_id: studentId };
  if (Object.values(m).some((v) => v !== null)) {
    await supabase.from('body_measurements').insert({ ...base, measured_on: todayIso(), ...m });
  }
  const note = str(form, 'note');
  const photo = form.get('photo');
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (note || hasPhoto) {
    let photoPath: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      const path = `${member.gymId}/${studentId}/${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage
        .from('progress-photos')
        .upload(path, photo, { contentType: photo.type || 'image/jpeg' });
      if (!up.error) photoPath = path;
    }
    await supabase
      .from('progress_notes')
      .insert({ ...base, noted_on: todayIso(), content: note || 'Ảnh tiến độ', photo_path: photoPath });
  }
  revalidatePath(`/students/${studentId}`);
}

export async function addMealPlan(studentId: string, form: FormData) {
  const member = await getCurrentMember();
  const content = str(form, 'content');
  if (!content) return;
  const supabase = await createServerSupabase();
  await supabase.from('meal_plans').insert({
    gym_id: member.gymId,
    student_id: studentId,
    effective_from: todayIso(),
    content,
    calories: num(form, 'calories'),
    protein_g: num(form, 'protein_g'),
    carbs_g: num(form, 'carbs_g'),
    fat_g: num(form, 'fat_g'),
  });
  revalidatePath(`/students/${studentId}`);
}

export async function addPackage(studentId: string, form: FormData) {
  const member = await getCurrentMember();
  const total = num(form, 'total_sessions');
  if (!total || total <= 0) return;
  const supabase = await createServerSupabase();
  await supabase.from('packages').insert({
    gym_id: member.gymId,
    student_id: studentId,
    total_sessions: total,
    start_date: todayIso(),
    expires_on: str(form, 'expires_on') || null,
  });
  revalidatePath(`/students/${studentId}`);
}
