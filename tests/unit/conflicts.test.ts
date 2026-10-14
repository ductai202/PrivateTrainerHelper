import { describe, it, expect } from 'vitest';
import { findConflicts } from '@/lib/domain/conflicts';
import { mk, at } from './helpers';

describe('findConflicts', () => {
  it('back-to-back is not a conflict', () => {
    const e = [mk({ ptId: 'pt', startAt: at('08:00'), endAt: at('09:00') })];
    expect(
      findConflicts({ ptId: 'pt', studentId: 'x', startAt: at('09:00'), endAt: at('10:00') }, e),
    ).toEqual([]);
  });
  it('overlap same PT or same student conflicts; cancelled and self ignored', () => {
    const a = mk({ id: 'a', ptId: 'pt', studentId: 's1', startAt: at('08:00'), endAt: at('09:00') });
    const b = mk({ id: 'b', ptId: 'pt2', studentId: 's2', startAt: at('08:30'), endAt: at('09:30') });
    const c = mk({
      id: 'c',
      ptId: 'pt',
      studentId: 's3',
      startAt: at('08:00'),
      endAt: at('09:00'),
      status: 'cancelled',
    });
    const r = findConflicts(
      { id: 'a', ptId: 'pt', studentId: 's2', startAt: at('08:15'), endAt: at('08:45') },
      [a, b, c],
    );
    expect(r.map((x) => x.id)).toEqual(['b']);
  });
});
