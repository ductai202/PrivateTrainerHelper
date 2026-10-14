import { describe, it, expect } from 'vitest';
import { vnDayRange, vnWeekRange, vnWeekday, vnHHmm, vnDateLabel } from '@/lib/time';

describe('vn time', () => {
  it('VN day at 06:30 VN (23:30 UTC prev day)', () => {
    const r = vnDayRange(new Date('2026-10-19T23:30:00Z'));
    expect(r.start.toISOString()).toBe('2026-10-19T17:00:00.000Z');
    expect(r.end.toISOString()).toBe('2026-10-20T17:00:00.000Z');
  });
  it('week starts Monday VN', () => {
    expect(vnWeekRange(new Date('2026-10-22T03:00:00Z')).start.toISOString()).toBe(
      '2026-10-18T17:00:00.000Z',
    );
  });
  it('labels', () => {
    expect(vnHHmm(new Date('2026-10-20T01:30:00Z'))).toBe('08:30');
    expect(vnDateLabel(new Date('2026-10-20T01:30:00Z'))).toBe('Thứ 3, 20/10');
    expect(vnDateLabel(new Date('2026-10-26T01:30:00Z'))).toBe('Thứ 2, 26/10');
    expect(vnDateLabel(new Date('2026-10-25T01:30:00Z'))).toBe('Chủ nhật, 25/10');
    expect(vnWeekday(new Date('2026-10-25T18:00:00Z'))).toBe(1);
  });
});
