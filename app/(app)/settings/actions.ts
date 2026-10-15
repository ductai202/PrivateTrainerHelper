'use server';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { validateNewPassword } from '@/lib/auth/password';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';

export type PasswordState = { error?: string; ok?: string } | undefined;

export async function changePassword(_prev: PasswordState, form: FormData): Promise<PasswordState> {
  await getCurrentMember();
  const password = String(form.get('password') ?? '');
  const problem = validateNewPassword(password, String(form.get('confirm') ?? ''));
  if (problem) return { error: problem };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: 'Không đổi được mật khẩu, hãy thử mật khẩu khác' };
  return { ok: 'Đã đổi mật khẩu' };
}

export type ReviewTimeState = { error?: string; ok?: string } | undefined;

export async function saveReviewTime(
  _prev: ReviewTimeState,
  form: FormData,
): Promise<ReviewTimeState> {
  const member = await getCurrentMember();
  const time = String(form.get('time') ?? '');
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time)) return { error: 'Giờ không hợp lệ' };
  // members has no UPDATE policy; the caller is authenticated and only their own row is touched
  const { error } = await createAdminSupabase()
    .from('members')
    .update({ evening_review_time: time })
    .eq('id', member.id);
  if (error) return { error: 'Không lưu được giờ nhắc' };
  return { ok: 'Đã lưu giờ nhắc' };
}
