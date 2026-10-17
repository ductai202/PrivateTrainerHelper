import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { createServerSupabase } from '@/lib/supabase/server';
import { vnDateLabel } from '@/lib/time';
import InvitePt from './InvitePt';

function monthRange(m: string) {
  const [y, mo] = m.split('-').map(Number);
  const start = new Date(Date.UTC(y, mo - 1, 1) - 7 * 3600000);
  const end = new Date(Date.UTC(y, mo, 1) - 7 * 3600000);
  return { start, end };
}
function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default async function OwnerPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const member = await getCurrentMember();
  if (member.role !== 'owner') redirect('/today');

  const sp = await searchParams;
  const nowVn = new Date(Date.now() + 7 * 3600000);
  const defaultMonth = `${nowVn.getUTCFullYear()}-${String(nowVn.getUTCMonth() + 1).padStart(2, '0')}`;
  const month = /^\d{4}-\d{2}$/.test(sp.m ?? '') ? sp.m! : defaultMonth;
  const range = monthRange(month);

  const supabase = await createServerSupabase();
  const [{ data: pts }, { data: sessions }, { data: students }] = await Promise.all([
    supabase
      .from('members')
      .select('id, display_name')
      .eq('gym_id', member.gymId)
      .eq('role', 'pt')
      .order('display_name'),
    supabase
      .from('sessions')
      .select('id, pt_id, status, student_signed, start_at, students(full_name)')
      .eq('gym_id', member.gymId)
      .gte('start_at', range.start.toISOString())
      .lt('start_at', range.end.toISOString())
      .order('start_at'),
    supabase.from('students').select('id, pt_id').eq('gym_id', member.gymId).eq('archived', false),
  ]);

  const rows = (pts ?? []).map((p) => {
    const mine = (sessions ?? []).filter((s) => s.pt_id === p.id);
    return {
      id: p.id,
      name: p.display_name,
      done: mine.filter((s) => s.status === 'done').length,
      unsigned: mine.filter((s) => s.status === 'done' && !s.student_signed).length,
      cancelled: mine.filter((s) => s.status === 'cancelled').length,
      students: (students ?? []).filter((s) => s.pt_id === p.id).length,
    };
  });
  const unsigned = (sessions ?? []).filter((s) => s.status === 'done' && !s.student_signed);
  const ptName = new Map((pts ?? []).map((p) => [p.id, p.display_name]));

  return (
    <main className="space-y-5 p-4">
      <div className="flex items-center justify-between">
        <Link href={`/owner?m=${shiftMonth(month, -1)}`} className="min-h-11 rounded border px-3 py-2">
          Tháng trước
        </Link>
        <h1 className="font-semibold">Tháng {month}</h1>
        <Link href={`/owner?m=${shiftMonth(month, 1)}`} className="min-h-11 rounded border px-3 py-2">
          Tháng sau
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>PT</th>
            <th>Hoàn thành</th>
            <th>Chưa ký</th>
            <th>Huỷ</th>
            <th>Học viên</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <Link href={`/owner/pts/${r.id}`} className="font-medium underline">
                  {r.name}
                </Link>
              </td>
              <td data-testid="done">{r.done}</td>
              <td data-testid="unsigned">{r.unsigned}</td>
              <td data-testid="cancelled">{r.cancelled}</td>
              <td data-testid="students">{r.students}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="space-y-2">
        <h2 className="font-medium">Buổi chưa ký</h2>
        <ul className="space-y-2">
          {unsigned.map((s) => (
            <li key={s.id}>
              <Link href={`/sessions/${s.id}`} className="block rounded border p-3 text-sm">
                {vnDateLabel(new Date(s.start_at))} ·{' '}
                {(s.students as { full_name: string } | null)?.full_name} · {ptName.get(s.pt_id)}
              </Link>
            </li>
          ))}
          {unsigned.length === 0 && <li className="text-slate-600">Không có buổi nào chưa ký.</li>}
        </ul>
      </section>

      <InvitePt />
    </main>
  );
}
