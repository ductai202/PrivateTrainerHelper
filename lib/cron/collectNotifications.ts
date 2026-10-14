import { needsChecklistPush, pendingChecklist } from '@/lib/domain/checklist';
import type { SessionLite } from '@/lib/domain/types';
import { vnDateIso, vnHHmm } from '@/lib/time';

export interface NotifSession extends SessionLite {
  checklistPushedAt: Date | null;
  checklistRemindedAt: Date | null;
  studentName: string;
}

export interface CollectData {
  sessions: NotifSession[];
  tomorrowCountByPt: Record<string, number>;
  remindedTomorrowByPt: Record<string, number>;
  pushLog: { memberId: string; kind: string; forDate: string }[];
}

export interface Notification {
  memberId: string;
  kind: 'checklist' | 'checklist_eod' | 'tomorrow';
  title: string;
  body: string;
  url: string;
  sessionId?: string;
}

const EOD_FROM = '21:00';
const TOMORROW_FROM = '20:00';

/** Pure: decides which pushes are due at `now`. The caller persists the dedupe markers. */
export function collectNotifications(now: Date, data: CollectData): Notification[] {
  const out: Notification[] = [];
  const today = vnDateIso(now);
  const clock = vnHHmm(now);
  const logged = (memberId: string, kind: string) =>
    data.pushLog.some((l) => l.memberId === memberId && l.kind === kind && l.forDate === today);

  for (const s of data.sessions) {
    if (needsChecklistPush(s, now) && s.checklistPushedAt === null) {
      out.push({
        memberId: s.ptId,
        kind: 'checklist',
        title: `Buổi với ${s.studentName} đã xong`,
        body: 'Kiểm tra: đã ký buổi? đã ghi bài tập?',
        url: `/sessions/${s.id}`,
        sessionId: s.id,
      });
    }
  }

  if (clock >= EOD_FROM) {
    const unfinishedByPt = new Map<string, number>();
    for (const s of data.sessions) {
      if (vnDateIso(s.startAt) !== today || s.endAt > now) continue;
      if (pendingChecklist(s, now).length === 0) continue;
      unfinishedByPt.set(s.ptId, (unfinishedByPt.get(s.ptId) ?? 0) + 1);
    }
    for (const [memberId, n] of unfinishedByPt) {
      if (logged(memberId, 'checklist_eod')) continue;
      out.push({
        memberId,
        kind: 'checklist_eod',
        title: 'Còn buổi chưa hoàn tất',
        body: `Còn ${n} buổi hôm nay chưa hoàn tất checklist`,
        url: '/today',
      });
    }
  }

  if (clock >= TOMORROW_FROM) {
    for (const [memberId, total] of Object.entries(data.tomorrowCountByPt)) {
      const left = total - (data.remindedTomorrowByPt[memberId] ?? 0);
      if (left <= 0 || logged(memberId, 'tomorrow')) continue;
      out.push({
        memberId,
        kind: 'tomorrow',
        title: 'Nhắc lịch ngày mai',
        body: `Bạn có ${left} buổi mai chưa nhắc học viên`,
        url: '/reminders',
      });
    }
  }
  return out;
}
