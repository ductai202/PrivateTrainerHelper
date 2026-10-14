'use server';
import { revalidatePath } from 'next/cache';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { createAdminSupabase } from '@/lib/supabase/admin';

export type InviteState = { error?: string; ok?: string } | undefined;

export async function invitePt(_prev: InviteState, form: FormData): Promise<InviteState> {
  const member = await getCurrentMember();
  if (member.role !== 'owner') return { error: 'Chỉ chủ gym mới được mời PT' };
  const email = String(form.get('email') ?? '').trim();
  const displayName = String(form.get('display_name') ?? '').trim();
  if (!email || !displayName) return { error: 'Vui lòng nhập email và tên' };

  const admin = createAdminSupabase();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error || !data.user) return { error: 'Không gửi được lời mời' };
  const { error: insertError } = await admin.from('members').insert({
    gym_id: member.gymId,
    user_id: data.user.id,
    display_name: displayName,
    role: 'pt',
  });
  if (insertError) return { error: 'Không thêm được PT' };
  revalidatePath('/owner');
  return { ok: `Đã mời ${displayName}` };
}
