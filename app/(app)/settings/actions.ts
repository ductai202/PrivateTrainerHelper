'use server';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { validateNewPassword } from '@/lib/auth/password';
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
