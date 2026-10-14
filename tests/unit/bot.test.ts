import { describe, it, expect } from 'vitest';
import { parseBotUpdate, classifyReply } from '@/lib/zalo/intent';

describe('parseBotUpdate', () => {
  it('extracts chat id and text from a message update', () => {
    expect(
      parseBotUpdate({ message: { chat: { id: '123' }, text: ' ab12cd ' } }),
    ).toEqual({ chatId: '123', text: 'ab12cd' });
  });
  it('returns null for updates without text', () => {
    expect(parseBotUpdate({})).toBeNull();
    expect(parseBotUpdate({ message: { chat: { id: '1' } } })).toBeNull();
    expect(parseBotUpdate(null)).toBeNull();
  });
});

describe('classifyReply', () => {
  it.each([
    ['ok', 'confirm'],
    ['OK ạ', 'confirm'],
    ['Xác nhận', 'confirm'],
    ['huỷ', 'cancel'],
    ['Hủy buổi mai', 'cancel'],
    ['cancel', 'cancel'],
    ['AB12CD', 'code'],
    ['xin chào', 'unknown'],
    ['Ok anh, em Huy đây', 'unknown'],
    ['em nghĩ là ok', 'unknown'],
    ['không huỷ đâu', 'unknown'],
    ['em xin huỷ', 'cancel'],
  ])('%s -> %s', (text, expected) => {
    expect(classifyReply(text)).toBe(expected);
  });
});
