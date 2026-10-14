import { vnDateLabel, vnHHmm } from '@/lib/time';

export function reminderMessage(p: { studentName: string; ptName: string; startAt: Date }): string {
  return `Chào ${p.studentName}, nhắc lịch tập với PT ${p.ptName} lúc ${vnHHmm(p.startAt)} ${vnDateLabel(p.startAt)}. Bạn xác nhận giúp mình nhé!`;
}

export function fillInInviteMessage(p: {
  studentName: string;
  ptName: string;
  startAt: Date;
  endAt: Date;
}): string {
  return `Chào ${p.studentName}, PT ${p.ptName} vừa có slot trống ${vnHHmm(p.startAt)}–${vnHHmm(p.endAt)} ${vnDateLabel(p.startAt)}. Bạn có muốn tập giờ này không?`;
}
