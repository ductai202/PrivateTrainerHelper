import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export interface CurrentMember {
  id: string;
  gymId: string;
  role: 'owner' | 'pt';
  displayName: string;
}

export async function getCurrentMember(): Promise<CurrentMember> {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  const { data: m } = await supabase
    .from('members')
    .select('id, gym_id, role, display_name')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!m) redirect('/login');
  return { id: m.id, gymId: m.gym_id, role: m.role as 'owner' | 'pt', displayName: m.display_name };
}
