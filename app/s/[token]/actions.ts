'use server';
import { revalidatePath } from 'next/cache';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { resolveStudent } from '@/lib/student/portal';

export type PortalState = { error?: string; ok?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

/** Replaces the student's free hours with one window applied to the chosen weekdays. */
export async function saveAvailability(
  token: string,
  _prev: PortalState,
  form: FormData,
): Promise<PortalState> {
  const student = await resolveStudent(token);
  if (!student) return { error: 'Liên kết không hợp lệ hoặc đã hết hạn.' };

  const days = [...new Set(form.getAll('avail_days').map((d) => Number(d)))].filter(
    (d) => Number.isInteger(d) && d >= 0 && d <= 6,
  );
  const from = str(form, 'avail_from');
  const to = str(form, 'avail_to');
  if (days.length === 0) return { error: 'Chọn ít nhất một ngày rảnh' };
  if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) return { error: 'Vui lòng nhập giờ rảnh' };
  if (from >= to) return { error: 'Giờ kết thúc phải sau giờ bắt đầu' };

  const db = createAdminSupabase();
  await db.from('student_availability').delete().eq('student_id', student.id);
  const { error } = await db.from('student_availability').insert(
    days.map((weekday) => ({
      gym_id: student.gym_id,
      student_id: student.id,
      weekday,
      from_time: from,
      to_time: to,
    })),
  );
  if (error) return { error: 'Không lưu được giờ rảnh' };
  revalidatePath(`/s/${token}`);
  return { ok: 'Đã lưu giờ rảnh' };
}

export async function joinWaitlist(token: string): Promise<void> {
  const student = await resolveStudent(token);
  if (!student) return;
  const db = createAdminSupabase();
  const { data } = await db
    .from('waitlist_entries')
    .select('id')
    .eq('student_id', student.id)
    .eq('active', true)
    .maybeSingle();
  if (!data) {
    await db.from('waitlist_entries').insert({ gym_id: student.gym_id, student_id: student.id });
  }
  revalidatePath(`/s/${token}`);
}

export async function leaveWaitlist(token: string): Promise<void> {
  const student = await resolveStudent(token);
  if (!student) return;
  await createAdminSupabase()
    .from('waitlist_entries')
    .update({ active: false })
    .eq('student_id', student.id)
    .eq('active', true);
  revalidatePath(`/s/${token}`);
}
