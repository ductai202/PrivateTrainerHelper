import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { listSessions } from '@/lib/data/sessions';
import { listStudents } from '@/lib/data/students';
import { createServerSupabase } from '@/lib/supabase/server';
import SessionCard from '@/components/SessionCard';
import { Avatar } from '@/components/ui/Avatar';

export default async function PtOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (member.role !== 'owner') redirect('/today');

  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: pt } = /^[0-9a-f-]{36}$/i.test(id)
    ? await supabase
        .from('members')
        .select('id, display_name, gender, birth_year')
        .eq('id', id)
        .eq('gym_id', member.gymId)
        .eq('role', 'pt')
        .maybeSingle()
    : { data: null };
  if (!pt) return <main className="p-4">Không tìm thấy PT</main>;

  const now = new Date();
  const [students, sessions] = await Promise.all([
    listStudents(),
    listSessions({ start: now, end: new Date(now.getTime() + 7 * 24 * 3600_000) }, pt.id),
  ]);
  const mine = students.filter((s) => s.ptId === pt.id);
  const upcoming = sessions.filter((s) => s.status !== 'cancelled');

  return (
    <main className="space-y-5 p-4">
      <Link href="/owner" className="text-sm text-slate-600 underline">
        ← Quản lý
      </Link>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <Avatar name={pt.display_name} size={56} />
        <div>
          <h1 className="text-xl font-semibold">{pt.display_name}</h1>
          <p className="text-sm text-slate-600">
            {pt.gender === 'male' ? 'Nam' : pt.gender === 'female' ? 'Nữ' : 'Chưa khai giới tính'}
            {pt.birth_year ? ` · sinh năm ${pt.birth_year}` : ''}
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Học viên của PT ({mine.length})</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-slate-600">PT này chưa có học viên.</p>
        ) : (
          <ul className="space-y-2">
            {mine.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/students/${s.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <Avatar name={s.fullName} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.fullName}</div>
                    <div className="text-xs text-slate-600">
                      {s.remaining === null ? 'Chưa có gói' : `Còn ${s.remaining} buổi`}
                      {s.expiringSoon ? ' · Sắp hết gói' : ''}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Buổi sắp tới (7 ngày)</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-600">Không có buổi nào trong 7 ngày tới.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((s) => (
              <li key={s.id}>
                <SessionCard s={s} now={now} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
