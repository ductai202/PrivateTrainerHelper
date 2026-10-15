import Link from 'next/link';
import { Check, Clock, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import type { SessionRow } from '@/lib/data/sessions';
import { pendingChecklist } from '@/lib/domain/checklist';
import { studentBusy, studentSick } from '@/app/(app)/sessions/lateChanges';
import { vnHHmm } from '@/lib/time';

const FRAME: Record<string, string> = {
  scheduled: 'border-l-slate-400',
  confirmed: 'border-l-sky-500',
  done: 'border-l-green-500',
  no_show: 'border-l-orange-500',
  cancelled: 'border-l-rose-300 opacity-70',
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
  const cancelled = s.status === 'cancelled';
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-l-4 border-slate-200 bg-white shadow-sm ${FRAME[s.status] ?? ''}`}
      data-testid="session-card"
    >
      <Link href={`/sessions/${s.id}`} className="flex items-center gap-3 p-3">
        <Avatar name={s.studentName} />
        <div className="min-w-0 flex-1">
          <div className={`font-semibold text-slate-900 ${cancelled ? 'line-through' : ''}`}>
            {s.studentName}
          </div>
          <div className="flex items-center gap-1 text-sm text-slate-600">
            <Clock size={14} aria-hidden />
            <span className={cancelled ? 'line-through' : ''}>
              {vnHHmm(s.startAt)}–{vnHHmm(s.endAt)}
            </span>
            {showPt && <span className="text-xs text-slate-500">· {s.ptName}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {unfinished && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Chưa xong
            </span>
          )}
          {s.status === 'confirmed' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
              <Check size={12} aria-hidden /> Đã xác nhận
            </span>
          )}
          {s.status === 'done' && !unfinished && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              Hoàn thành
            </span>
          )}
          {s.status === 'no_show' && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
              Vắng
            </span>
          )}
          {cancelled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
              <X size={12} aria-hidden /> Đã huỷ
            </span>
          )}
        </div>
      </Link>
      {upcoming && (
        <div className="flex gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2">
          <form action={studentBusy.bind(null, s.id)}>
            <button className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium">
              HV bận
            </button>
          </form>
          <form action={studentSick.bind(null, s.id)}>
            <button className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium">
              HV ốm
            </button>
          </form>
          <Link
            href={`/sessions/${s.id}?reschedule=1`}
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium"
          >
            Đổi giờ
          </Link>
        </div>
      )}
    </div>
  );
}
