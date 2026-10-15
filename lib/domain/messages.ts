import { vnDateLabel, vnHHmm } from '@/lib/time';
import { cap, type Address } from './address';

/** Friendly, first-person messages from the PT to a student, in the right form of address. */

export function reminderMessage(p: { address: Address; startAt: Date; link?: string }): string {
  const { you, me, name } = p.address;
  const base = `Hi ${you} ${name} ơi 👋 ${cap(me)} nhắc lịch tập lúc ${vnHHmm(p.startAt)} ${vnDateLabel(p.startAt)} nha. ${cap(you)} xác nhận giúp ${me} nhé!`;
  return p.link ? `${base} Bận thì bấm link báo ${me} liền nha: ${p.link}` : base;
}

export function fillInInviteMessage(p: { address: Address; startAt: Date; endAt: Date }): string {
  const { you, me, name } = p.address;
  return `${cap(you)} ${name} ơi, ${me} vừa có slot trống ${vnHHmm(p.startAt)}–${vnHHmm(p.endAt)} ${vnDateLabel(p.startAt)} nè. ${cap(you)} tập giờ này được không? 💪`;
}

export function botPrecheckMessage(p: { address: Address; startAt: Date }): string {
  const { you, name } = p.address;
  return `${cap(you)} ${name} ơi, mình vẫn tập lúc ${vnHHmm(p.startAt)} nha? Trả lời "OK" để xác nhận hoặc "Bận" nếu không tập được nhé.`;
}

export function personalLinkMessage(p: { address: Address; link: string }): string {
  const { you, name } = p.address;
  return `Hi ${you} ${name} ơi, đây là link xem lịch tập, đổi giờ và khai giờ rảnh của ${you} nè: ${p.link}`;
}

export function botConnectedMessage(a: Address): string {
  return `Kết nối xong rồi nha ${a.you} ${a.name} 🎉 Khi nhận nhắc lịch, ${a.you} trả lời "OK" để xác nhận hoặc "Bận" nếu không tập được. Nhắn "?" để xem hướng dẫn.`;
}

export function botReplyMessage(a: Address, result: 'confirmed' | 'cancelled' | 'not_allowed'): string {
  if (result === 'confirmed') return `Ok ${a.you}, ${a.me} ghi nhận rồi nha. Hẹn gặp ${a.you}!`;
  if (result === 'cancelled') return `${cap(a.me)} ghi nhận ${a.you} bận rồi nha, hẹn ${a.you} buổi sau 👍`;
  return `Buổi này không đổi được nữa rồi, ${a.you} nhắn trực tiếp cho ${a.me} nha.`;
}

export function botUnknownMessage(a: Address): string {
  return `${cap(a.you)} trả lời "OK" để xác nhận hoặc "Bận" nếu không tập được nha. Nhắn "?" để xem hướng dẫn.`;
}

export function botHelpMessage(a: Address, personalLink: string | null): string {
  const lines = [
    `Hướng dẫn nhanh nè ${a.you} ${a.name}:`,
    '• Trả lời "OK" để xác nhận buổi tập',
    '• Trả lời "Bận" nếu không tập được',
    '• Nhắn "stop" để ngắt kết nối bot',
  ];
  if (personalLink) lines.push(`• Xem lịch, đổi giờ, khai giờ rảnh: ${personalLink}`);
  return lines.join('\n');
}
