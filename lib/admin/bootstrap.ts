import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

export interface EnsureOwnerInput {
  email: string;
  password: string;
  gymName: string;
  displayName: string;
  /** Overwrite the password of an account that already exists. Off by default. */
  resetPassword?: boolean;
  /**
   * Mark the account as platform admin (can create and switch between centers). Stored in
   * `app_metadata`, which only the service role can write. Never removed by this function.
   */
  platformAdmin?: boolean;
}

export interface EnsureOwnerResult {
  created: boolean;
  userId: string;
  gymId: string;
  memberId: string;
}

const MIN_PASSWORD = 8;

async function findUserId(db: SupabaseClient<Database>, email: string): Promise<string | null> {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Không đọc được danh sách tài khoản: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Makes sure `email` is the owner (admin) of a gym called `gymName`. Safe to run any number of
 * times: it never duplicates the account, the gym or the membership, and it only changes an
 * existing password when `resetPassword` is set. Service-role client required.
 */
export async function ensureOwner(
  db: SupabaseClient<Database>,
  input: EnsureOwnerInput,
): Promise<EnsureOwnerResult> {
  const email = input.email.trim().toLowerCase();
  let userId = await findUserId(db, email);
  let created = false;

  if (!userId) {
    if (input.password.length < MIN_PASSWORD) {
      throw new Error(`Mật khẩu phải có ít nhất ${MIN_PASSWORD} ký tự`);
    }
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`Không tạo được tài khoản: ${error?.message}`);
    userId = data.user.id;
    created = true;
  } else if (input.resetPassword) {
    if (input.password.length < MIN_PASSWORD) {
      throw new Error(`Mật khẩu phải có ít nhất ${MIN_PASSWORD} ký tự`);
    }
    const { error } = await db.auth.admin.updateUserById(userId, { password: input.password });
    if (error) throw new Error(`Không đặt lại được mật khẩu: ${error.message}`);
  }

  if (input.platformAdmin) {
    const { data: current } = await db.auth.admin.getUserById(userId);
    if (current.user?.app_metadata?.platform_admin !== true) {
      const { error } = await db.auth.admin.updateUserById(userId, {
        app_metadata: { ...(current.user?.app_metadata ?? {}), platform_admin: true },
      });
      if (error) throw new Error(`Không đặt được quyền admin: ${error.message}`);
    }
  }

  // find or create the center by name, then make sure this user owns it
  let gymId: string;
  const { data: gym } = await db.from('gyms').select('id').eq('name', input.gymName).limit(1).maybeSingle();
  if (gym) {
    gymId = gym.id;
  } else {
    const { data: made, error } = await db.from('gyms').insert({ name: input.gymName }).select('id').single();
    if (error || !made) throw new Error(`Không tạo được phòng tập: ${error?.message}`);
    gymId = made.id;
  }

  const { data: existing } = await db
    .from('members')
    .select('id, role')
    .eq('user_id', userId)
    .eq('gym_id', gymId)
    .maybeSingle();
  if (existing) {
    if (existing.role !== 'owner') {
      const { error } = await db.from('members').update({ role: 'owner' }).eq('id', existing.id);
      if (error) throw new Error(`Không nâng quyền được: ${error.message}`);
    }
    return { created, userId, gymId, memberId: existing.id };
  }

  const { data: member, error } = await db
    .from('members')
    .insert({ gym_id: gymId, user_id: userId, display_name: input.displayName, role: 'owner' })
    .select('id')
    .single();
  if (error || !member) throw new Error(`Không tạo được chủ gym: ${error?.message}`);
  return { created, userId, gymId, memberId: member.id };
}
