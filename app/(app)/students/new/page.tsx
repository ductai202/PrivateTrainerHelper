import { getCurrentMember } from '@/lib/auth/currentMember';
import { createServerSupabase } from '@/lib/supabase/server';
import StudentForm from './StudentForm';

export default async function NewStudentPage() {
  const member = await getCurrentMember();
  let pts: { id: string; name: string }[] | undefined;
  if (member.role === 'owner') {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from('members')
      .select('id, display_name')
      .eq('gym_id', member.gymId)
      .eq('role', 'pt')
      .order('display_name');
    pts = (data ?? []).map((p) => ({ id: p.id, name: p.display_name }));
  }
  return <StudentForm pts={pts} />;
}
