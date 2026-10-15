import { describe, it, expect } from 'vitest';
import { formatBotNotification } from '@/lib/notify';

describe('formatBotNotification', () => {
  const p = { title: 'Lan huỷ buổi', body: '17:00 Thứ 3, 20/10', url: '/sessions/abc' };

  it('puts the title and body on separate lines', () => {
    expect(formatBotNotification(p)).toBe('Lan huỷ buổi\n17:00 Thứ 3, 20/10');
  });

  it('appends a deep link when the app origin is known', () => {
    expect(formatBotNotification(p, 'https://app.test')).toBe(
      'Lan huỷ buổi\n17:00 Thứ 3, 20/10\nhttps://app.test/sessions/abc',
    );
  });

  it('tolerates a trailing slash on the origin', () => {
    expect(formatBotNotification(p, 'https://app.test/')).toContain('https://app.test/sessions/abc');
  });

  it('does not invent a link without an origin', () => {
    expect(formatBotNotification(p, undefined)).not.toContain('http');
  });
});
