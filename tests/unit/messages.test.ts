import { describe, it, expect } from 'vitest';
import { reminderMessage, fillInInviteMessage } from '@/lib/domain/messages';

describe('messages', () => {
  it('reminder copy', () => {
    expect(
      reminderMessage({
        studentName: 'Lan',
        ptName: 'Tài',
        startAt: new Date('2026-10-20T01:30:00Z'),
      }),
    ).toBe('Chào Lan, nhắc lịch tập với PT Tài lúc 08:30 Thứ 3, 20/10. Bạn xác nhận giúp mình nhé!');
  });
  it('fill-in copy', () => {
    expect(
      fillInInviteMessage({
        studentName: 'Minh',
        ptName: 'Tài',
        startAt: new Date('2026-10-20T10:00:00Z'),
        endAt: new Date('2026-10-20T11:00:00Z'),
      }),
    ).toBe('Chào Minh, PT Tài vừa có slot trống 17:00–18:00 Thứ 3, 20/10. Bạn có muốn tập giờ này không?');
  });
});
