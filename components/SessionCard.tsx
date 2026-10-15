import Link from 'next/link';
import type { SessionRow } from '@/lib/data/sessions';
import { pendingChecklist } from '@/lib/domain/checklist';
import { studentBusy, studentSick } from '@/app/(app)/sessions/lateChanges';
import { vnHHmm } from '@/lib/time';

const COLORS: Record<string, string> = {
  scheduled: 'border-slate-300 bg-slate-50',
  confirmed: 'border-blue-300 bg-blue-50',
  done: 'border-green-300 bg-green-50',
  no_show: 'border-orange-300 bg-orange-50',
  cancelled: 'border-slate-200 bg-white text-slate-400',
};

export default function SessionCard({
  s,
  now,
  showPt = false,
}: {
  s: SessionRow;
  now: Date;
  showPt?: boolean;
}) {
  const unfinished = s.endAt <= now && pendingChecklist(s, now).length > 0;
  const upcoming = (s.status === 'scheduled' || s.status === 'confirmed') && s.endAt > now;
  return (
    <div className={`rounded border ${COLORS[s.status] ?? ''}`} data-testid="session-card">
      <Link href={`/sessions/${s.id}`} className="block p-3">
        <div className="flex items-center justify-between">
          <span className={`font-medium ${s.status === 'cancelled' ? 'line-through' : ''}`}>
            {vnHHmm(s.startAt)}–{vnHHmm(s.endAt)}
          </span>
          {unfinished && (
            <span className="rounded bg-amber-200 px-2 text-xs text-amber-900">Chưa xong</span>
          )}
          {s.status === 'confirmed' && (
            <span className="rounded bg-blue-200 px-2 text-xs text-blue-900">Đã xác nhận</span>
          )}
        </div>
        <div className={s.status === 'cancelled' ? 'line-through' : ''}>{s.studentName}</div>
        {showPt && <div className="text-xs text-slate-500">{s.ptName}</div>}
      </Link>
      {upcoming && (
        <div className="flex gap-2 border-t px-3 py-2">
          <form action={studentBusy.bind(null, s.id)}>
            <button className="min-h-11 rounded border bg-white px-3 text-sm">HV bận</button>
          </form>
          <form action={studentSick.bind(null, s.id)}>
            <button className="min-h-11 rounded border bg-white px-3 text-sm">HV ốm</button>
          </form>
          <Link
            href={`/sessions/${s.id}?reschedule=1`}
            className="inline-flex min-h-11 items-center rounded border bg-white px-3 text-sm"
          >
            Đổi giờ
          </Link>
        </div>
      )}
    </div>
  );
}
