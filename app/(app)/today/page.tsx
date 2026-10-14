import Link from 'next/link';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { createServerSupabase } from '@/lib/supabase/server';
import { listSessions } from '@/lib/data/sessions';
import { vnDateLabel, vnDayRange } from '@/lib/time';
import SessionCard from '@/components/SessionCard';

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ pt?: string }> }) {
  const sp = await searchParams;
  const member = await getCurrentMember();
  const now = new Date();
  const isOwner = member.role === 'owner';
  const filterPt = isOwner ? sp.pt || undefined : member.id;
  const sessions = await listSessions(vnDayRange(now), filterPt);

  let pts: { id: string; display_name: string }[] = [];
  if (isOwner) {
    const supabase = await createServerSupabase();
    const { data } = await supabase.from('members').select('id, display_name').eq('role', 'pt');
    pts = data ?? [];
  }

  return (
    <main className="space-y-3 p-4">
      <h1 className="text-xl font-semibold">Hôm nay · {vnDateLabel(now)}</h1>
      {isOwner && (
        <form className="flex items-center gap-2">
          <label htmlFor="pt" className="text-sm">
            PT
          </label>
          <select
            id="pt"
            name="pt"
            defaultValue={sp.pt ?? ''}
            className="min-h-11 rounded border px-2"
          >
            <option value="">Tất cả</option>
            {pts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
              </option>
            ))}
          </select>
          <button className="min-h-11 rounded border px-3">Lọc</button>
        </form>
      )}
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id}>
            <SessionCard s={s} now={now} showPt={isOwner} />
          </li>
        ))}
        {sessions.length === 0 && <li className="text-slate-600">Hôm nay chưa có buổi nào.</li>}
      </ul>
      <Link
        href="/sessions/new"
        aria-label="Tạo buổi"
        className="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-700 text-2xl text-white"
      >
        +
      </Link>
    </main>
  );
}
