import { describe, it, expect } from 'vitest';
import { classifyReply } from '@/lib/zalo/intent';

describe('help requests', () => {
  it.each(['?', '??', '？', 'help', 'Help', 'hướng dẫn', 'Huong dan', 'hd', 'menu', 'em cần hướng dẫn'])(
    '%s -> help',
    (text) => expect(classifyReply(text)).toBe('help'),
  );

  it('does not turn chatter into help', () => {
    expect(classifyReply('hôm nay trời đẹp quá')).toBe('unknown');
    expect(classifyReply('hdd mới mua')).toBe('unknown');
  });

  it('keeps the existing keywords working', () => {
    expect(classifyReply('OK')).toBe('confirm');
    expect(classifyReply('Bận')).toBe('cancel');
    expect(classifyReply('stop')).toBe('stop');
  });
});
