import { createServerSupabase } from '@/lib/supabase/server';

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const valid = /^[0-9a-f-]{36}$/i.test(id);
  const { data: s } = valid
    ? await supabase.from('students').select('*').eq('id', id).maybeSingle()
    : { data: null };
  if (!s) {
    return <main className="p-4">Không tìm thấy học viên</main>;
  }
  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold">{s.full_name}</h1>
    </main>
  );
}
