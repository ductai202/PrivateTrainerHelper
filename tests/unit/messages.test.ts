import { describe, it, expect } from 'vitest';
import {
  botConnectedMessage,
  botHelpMessage,
  botPrecheckMessage,
  botReplyMessage,
  botUnknownMessage,
  fillInInviteMessage,
  personalLinkMessage,
  reminderMessage,
} from '@/lib/domain/messages';
import type { Address } from '@/lib/domain/address';

const younger: Address = { you: 'em', me: 'anh', name: 'Lan' };
const older: Address = { you: 'chị', me: 'em', name: 'Hoa' };
const peer: Address = { you: 'bạn', me: 'mình', name: 'Minh' };
const at = new Date('2026-10-20T01:30:00Z'); // 08:30 Thứ 3, 20/10 VN
const end = new Date('2026-10-20T02:30:00Z');

describe('reminderMessage', () => {
  it('talks to a younger student as em', () => {
    expect(reminderMessage({ address: younger, startAt: at })).toBe(
      'Hi em Lan ơi 👋 Anh nhắc lịch tập lúc 08:30 Thứ 3, 20/10 nha. Em xác nhận giúp anh nhé!',
    );
  });

  it('talks to an older student as chị and the PT as em', () => {
    expect(reminderMessage({ address: older, startAt: at })).toBe(
      'Hi chị Hoa ơi 👋 Em nhắc lịch tập lúc 08:30 Thứ 3, 20/10 nha. Chị xác nhận giúp em nhé!',
    );
  });

  it('adds the busy link in the same voice', () => {
    expect(reminderMessage({ address: peer, startAt: at, link: 'https://app.test/c/abc' })).toBe(
      'Hi bạn Minh ơi 👋 Mình nhắc lịch tập lúc 08:30 Thứ 3, 20/10 nha. Bạn xác nhận giúp mình nhé! Bận thì bấm link báo mình liền nha: https://app.test/c/abc',
    );
  });
});

describe('other templates', () => {
  it('fill-in invite', () => {
    expect(fillInInviteMessage({ address: younger, startAt: at, endAt: end })).toBe(
      'Em Lan ơi, anh vừa có slot trống 08:30–09:30 Thứ 3, 20/10 nè. Em tập giờ này được không? 💪',
    );
  });

  it('bot precheck', () => {
    expect(botPrecheckMessage({ address: older, startAt: at })).toBe(
      'Chị Hoa ơi, mình vẫn tập lúc 08:30 nha? Trả lời "OK" để xác nhận hoặc "Bận" nếu không tập được nhé.',
    );
  });

  it('personal link', () => {
    expect(personalLinkMessage({ address: younger, link: 'https://app.test/s/x' })).toBe(
      'Hi em Lan ơi, đây là link xem lịch tập, đổi giờ và khai giờ rảnh của em nè: https://app.test/s/x',
    );
  });

  it('bot connected', () => {
    expect(botConnectedMessage(younger)).toBe(
      'Kết nối xong rồi nha em Lan 🎉 Khi nhận nhắc lịch, em trả lời "OK" để xác nhận hoặc "Bận" nếu không tập được. Nhắn "?" để xem hướng dẫn.',
    );
  });

  it('bot replies', () => {
    expect(botReplyMessage(younger, 'confirmed')).toBe('Ok em, anh ghi nhận rồi nha. Hẹn gặp em!');
    expect(botReplyMessage(older, 'cancelled')).toBe('Em ghi nhận chị bận rồi nha, hẹn chị buổi sau 👍');
    expect(botReplyMessage(peer, 'not_allowed')).toBe(
      'Buổi này không đổi được nữa rồi, bạn nhắn trực tiếp cho mình nha.',
    );
  });

  it('bot unknown + help', () => {
    expect(botUnknownMessage(younger)).toBe(
      'Em trả lời "OK" để xác nhận hoặc "Bận" nếu không tập được nha. Nhắn "?" để xem hướng dẫn.',
    );
    const help = botHelpMessage(younger, 'https://app.test/s/x');
    expect(help).toContain('OK');
    expect(help).toContain('Bận');
    expect(help).toContain('stop');
    expect(help).toContain('https://app.test/s/x');
    expect(botHelpMessage(younger, null)).not.toContain('http');
  });
});
