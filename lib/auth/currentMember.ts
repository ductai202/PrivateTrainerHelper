import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export const ACTIVE_CENTER_COOKIE = 'active_gym';

export interface Center {
  gymId: string;
  name: string;
  memberId: string;
  role: 'owner' | 'pt';
}

export interface CurrentMember {
  /** The membership (member row) of the center currently being worked in. */
  id: string;
  gymId: string;
  gymName: string;
  role: 'owner' | 'pt';
  displayName: string;
  /** Can create centers and see all of them. Set only through the service role. */
  isPlatformAdmin: boolean;
  /** Every center this account belongs to; more than one for the admin. */
  centers: Center[];
}

/**
 * The signed-in person in the active center. A user can belong to several centers (the admin);
 * the one they are working in is remembered in a cookie and falls back to the first membership.
 * Memoised per request so any loader may call it.
 */
export const getCurrentMember = cache(async (): Promise<CurrentMember> => {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const { data: rows } = await supabase
    .from('members')
    .select('id, gym_id, role, display_name, created_at, gyms(name)')
    .eq('user_id', auth.user.id)
    .order('created_at');
  const memberships = rows ?? [];
  if (memberships.length === 0) redirect('/login');

  const wanted = (await cookies()).get(ACTIVE_CENTER_COOKIE)?.value;
  const active = memberships.find((m) => m.gym_id === wanted) ?? memberships[0];

  return {
    id: active.id,
    gymId: active.gym_id,
    gymName: (active.gyms as { name: string } | null)?.name ?? '',
    role: active.role as 'owner' | 'pt',
    displayName: active.display_name,
    isPlatformAdmin: auth.user.app_metadata?.platform_admin === true,
    centers: memberships.map((m) => ({
      gymId: m.gym_id,
      name: (m.gyms as { name: string } | null)?.name ?? '',
      memberId: m.id,
      role: m.role as 'owner' | 'pt',
    })),
  };
});
