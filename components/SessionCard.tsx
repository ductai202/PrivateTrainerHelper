import Link from 'next/link';
import type { SessionRow } from '@/lib/data/sessions';
import { pendingChecklist } from '@/lib/domain/checklist';
import { vnHHmm } from '@/lib/time';

const COLORS: Record<string, string> = {
  scheduled: 'border-slate-300 bg-slate-50',
  confirmed: 'border-blue-300 bg-blue-50',
  done: 'border-green-300 bg-green-50',
  no_show: 'border-orange-300 bg-orange-50',
  cancelled: 'border-slate-200 bg-white line-through text-slate-400',
};

export default function SessionCard({ s, now, showPt = false }: { s: SessionRow; now: Date; showPt?: boolean }) {
  const unfinished = s.endAt <= now && pendingChecklist(s, now).length > 0;
  return (
    <Link
      href={`/sessions/${s.id}`}
      className={`block rounded border p-3 ${COLORS[s.status] ?? ''}`}
      data-testid="session-card"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {vnHHmm(s.startAt)}–{vnHHmm(s.endAt)}
        </span>
        {unfinished && (
          <span className="rounded bg-amber-200 px-2 text-xs text-amber-900">Chưa xong</span>
        )}
      </div>
      <div>{s.studentName}</div>
      {showPt && <div className="text-xs text-slate-500">{s.ptName}</div>}
    </Link>
  );
}
