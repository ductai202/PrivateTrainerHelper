'use server';
import { revalidatePath } from 'next/cache';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { generateTempPassword } from '@/lib/auth/password';
import { parseProfile } from '@/lib/auth/profile';
import { createAdminSupabase } from '@/lib/supabase/admin';

export type CreatePtState = { error?: string; ok?: string; tempPassword?: string } | undefined;

/**
 * Owner-only. Creates the login directly with a temporary password (no email round trip:
 * the app has no "set password" landing page), then the member row. If the member row fails
 * the auth user is removed again so no orphan account is left behind.
 */
export async function createPt(_prev: CreatePtState, form: FormData): Promise<CreatePtState> {
  const member = await getCurrentMember();
  if (member.role !== 'owner') return { error: 'Chỉ chủ gym mới được tạo tài khoản PT' };
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const displayName = String(form.get('display_name') ?? '').trim();
  if (!email || !displayName) return { error: 'Vui lòng nhập email và tên' };
  const profile = parseProfile(String(form.get('gender') ?? ''), String(form.get('birth_year') ?? ''));
  if (!profile.ok) return { error: profile.error };

  const admin = createAdminSupabase();
  const tempPassword = generateTempPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (error || !data.user) {
    return { error: /already|registered|exists/i.test(error?.message ?? '') ? 'Email này đã có tài khoản' : 'Không tạo được tài khoản' };
  }
  const { error: insertError } = await admin.from('members').insert({
    gym_id: member.gymId,
    user_id: data.user.id,
    display_name: displayName,
    role: 'pt',
    gender: profile.value.gender,
    birth_year: profile.value.birthYear,
  });
  if (insertError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: 'Không thêm được PT' };
  }
  revalidatePath('/owner');
  return { ok: `Đã tạo tài khoản cho ${displayName}`, tempPassword };
}
