import { createServerSupabase } from '@/lib/supabase/server';
import { vnDayRange } from '@/lib/time';
import SessionForm from './SessionForm';

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; date?: string; time?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('students')
    .select('id, full_name')
    .eq('archived', false)
    .order('full_name');
  const today = new Date(vnDayRange(new Date()).start.getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 10);
  return (
    <SessionForm
      students={(data ?? []).map((s) => ({ id: s.id, name: s.full_name }))}
      defaults={{ student: sp.student ?? '', date: sp.date ?? today, time: sp.time ?? '' }}
    />
  );
}
