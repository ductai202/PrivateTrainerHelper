import Link from 'next/link';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { listSessions } from '@/lib/data/sessions';
import { vnDateLabel, vnDayRange, vnWeekRange } from '@/lib/time';
import SessionCard from '@/components/SessionCard';

const WEEK_MS = 7 * 24 * 3600 * 1000;

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const sp = await searchParams;
  const offset = Number.parseInt(sp.w ?? '0', 10) || 0;
  const member = await getCurrentMember();
  const now = new Date();
  const range = vnWeekRange(new Date(now.getTime() + offset * WEEK_MS));
  const sessions = await listSessions(range, member.role === 'owner' ? undefined : member.id);

  const days = Array.from({ length: 7 }, (_, i) => new Date(range.start.getTime() + i * 24 * 3600 * 1000));
  return (
    <main className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Link href={`/week?w=${offset - 1}`} className="min-h-11 rounded border px-3 py-2">
          Tuần trước
        </Link>
        <h1 className="font-semibold">Tuần</h1>
        <Link href={`/week?w=${offset + 1}`} className="min-h-11 rounded border px-3 py-2">
          Tuần sau
        </Link>
      </div>
      {days.map((d) => {
        const r = vnDayRange(d);
        const list = sessions.filter((s) => s.startAt >= r.start && s.startAt < r.end);
        return (
          <section key={d.toISOString()}>
            <h2 className="mb-1 text-sm font-medium text-slate-600">{vnDateLabel(d)}</h2>
            <ul className="space-y-2">
              {list.map((s) => (
                <li key={s.id}>
                  <SessionCard s={s} now={now} showPt={member.role === 'owner'} />
                </li>
              ))}
              {list.length === 0 && <li className="text-sm text-slate-400">—</li>}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
