'use server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACTIVE_CENTER_COOKIE, getCurrentMember } from '@/lib/auth/currentMember';
import { createAdminSupabase } from '@/lib/supabase/admin';

export type CenterState = { error?: string; ok?: string } | undefined;

/** Work in another center the account belongs to. Anything else is refused. */
export async function switchCenter(gymId: string) {
  const member = await getCurrentMember();
  if (!member.centers.some((c) => c.gymId === gymId)) return;
  (await cookies()).set(ACTIVE_CENTER_COOKIE, gymId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath('/', 'layout');
  redirect('/today');
}

/** Platform admin only: creates a center and makes the admin its owner. */
export async function createCenter(_prev: CenterState, form: FormData): Promise<CenterState> {
  const member = await getCurrentMember();
  if (!member.isPlatformAdmin) return { error: 'Chỉ admin mới tạo được trung tâm' };
  const name = String(form.get('name') ?? '').trim();
  if (name.length < 2) return { error: 'Vui lòng nhập tên trung tâm' };

  const admin = createAdminSupabase();
  const { data: dupe } = await admin.from('gyms').select('id').eq('name', name).limit(1).maybeSingle();
  if (dupe) return { error: 'Đã có trung tâm trùng tên' };

  const { data: gym, error } = await admin.from('gyms').insert({ name }).select('id').single();
  if (error || !gym) return { error: 'Không tạo được trung tâm' };

  const { data: me } = await createAdminSupabase()
    .from('members')
    .select('user_id')
    .eq('id', member.id)
    .single();
  const { error: memberError } = await admin.from('members').insert({
    gym_id: gym.id,
    user_id: me!.user_id,
    display_name: member.displayName,
    role: 'owner',
  });
  if (memberError) {
    await admin.from('gyms').delete().eq('id', gym.id);
    return { error: 'Không gắn được admin vào trung tâm' };
  }
  revalidatePath('/', 'layout');
  return { ok: `Đã tạo trung tâm ${name}` };
}

/** Platform admin only: creates a separate owner account for one center. */
export async function createCenterOwner(
  gymId: string,
  _prev: CenterState,
  form: FormData,
): Promise<CenterState & { tempPassword?: string }> {
  const member = await getCurrentMember();
  if (!member.isPlatformAdmin) return { error: 'Chỉ admin mới tạo được chủ trung tâm' };
  if (!member.centers.some((c) => c.gymId === gymId)) return { error: 'Không tìm thấy trung tâm' };

  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const displayName = String(form.get('display_name') ?? '').trim();
  if (!email || !displayName) return { error: 'Vui lòng nhập email và tên' };

  const { generateTempPassword } = await import('@/lib/auth/password');
  const admin = createAdminSupabase();
  const tempPassword = generateTempPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (error || !data.user) {
    return {
      error: /already|registered|exists/i.test(error?.message ?? '')
        ? 'Email này đã có tài khoản'
        : 'Không tạo được tài khoản',
    };
  }
  const { error: insertError } = await admin.from('members').insert({
    gym_id: gymId,
    user_id: data.user.id,
    display_name: displayName,
    role: 'owner',
  });
  if (insertError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: 'Không thêm được chủ trung tâm' };
  }
  revalidatePath('/admin');
  return { ok: `Đã tạo chủ trung tâm ${displayName}`, tempPassword };
}
