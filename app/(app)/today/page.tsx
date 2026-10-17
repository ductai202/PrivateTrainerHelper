import Link from 'next/link';
import { CalendarCheck, CircleAlert, Plus, UserCheck } from 'lucide-react';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { createServerSupabase } from '@/lib/supabase/server';
import { listSessions } from '@/lib/data/sessions';
import { pendingChecklist } from '@/lib/domain/checklist';
import { vnDateLabel, vnDayRange } from '@/lib/time';
import SessionCard from '@/components/SessionCard';
import { SectionTitle } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';

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
    const { data } = await supabase.from('members')
      .select('id, display_name')
      .eq('gym_id', member.gymId)
      .eq('role', 'pt');
    pts = data ?? [];
  }

  const live = sessions.filter((s) => s.status !== 'cancelled');
  const confirmed = live.filter((s) => s.status === 'confirmed').length;
  const unfinished = live.filter((s) => s.endAt <= now && pendingChecklist(s, now).length > 0).length;
  const upcoming = sessions.filter(
    (s) => s.endAt > now && s.status !== 'done' && s.status !== 'no_show',
  );
  const past = sessions.filter((s) => !upcoming.includes(s));

  return (
    <main className="space-y-5 p-4">
      <div>
        <h1 className="text-xl font-semibold">Hôm nay · {vnDateLabel(now)}</h1>
        <p className="text-sm text-slate-600">
          {live.length === 0
            ? `Chào ${member.displayName}, hôm nay chưa có buổi nào.`
            : `Chào ${member.displayName}, hôm nay bạn có ${live.length} buổi.`}
        </p>
      </div>

      <div className="flex gap-2">
        <StatTile label="Buổi hôm nay" value={live.length} icon={<CalendarCheck size={14} aria-hidden />} />
        <StatTile
          label="Đã xác nhận"
          value={confirmed}
          tone="success"
          icon={<UserCheck size={14} aria-hidden />}
        />
        <StatTile
          label="Chưa xong"
          value={unfinished}
          tone={unfinished > 0 ? 'warning' : 'default'}
          icon={<CircleAlert size={14} aria-hidden />}
        />
      </div>

      {isOwner && (
        <form className="flex items-center gap-2">
          <label htmlFor="pt" className="text-sm font-medium">
            PT
          </label>
          <select
            id="pt"
            name="pt"
            defaultValue={sp.pt ?? ''}
            className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3"
          >
            <option value="">Tất cả</option>
            {pts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
              </option>
            ))}
          </select>
          <button className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-medium">
            Lọc
          </button>
        </form>
      )}

      {sessions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600">
          Hôm nay chưa có buổi nào.
          <div className="mt-1 text-sm">Bấm nút + để tạo buổi mới.</div>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-2">
          <SectionTitle count={upcoming.length}>Sắp tới</SectionTitle>
          <ul className="space-y-2">
            {upcoming.map((s) => (
              <li key={s.id}>
                <SessionCard s={s} now={now} showPt={isOwner} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-2">
          <SectionTitle count={past.length}>Đã qua</SectionTitle>
          <ul className="space-y-2">
            {past.map((s) => (
              <li key={s.id}>
                <SessionCard s={s} now={now} showPt={isOwner} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/sessions/new"
        aria-label="Tạo buổi"
        className="safe-bottom fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg"
      >
        <Plus size={26} aria-hidden />
      </Link>
    </main>
  );
}
