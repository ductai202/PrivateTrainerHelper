import { describe, it, expect } from 'vitest';
import { remainingSessions } from '@/lib/domain/packages';
import { mk } from './helpers';

describe('remainingSessions', () => {
  it('only done+signed of that package count', () => {
    const s = [
      mk({ status: 'done', studentSigned: true, packageId: 'p' }),
      mk({ status: 'done', studentSigned: false, packageId: 'p' }),
      mk({ status: 'no_show', packageId: 'p' }),
      mk({ status: 'cancelled', studentSigned: true, packageId: 'p' }),
      mk({ status: 'done', studentSigned: true, packageId: 'other' }),
    ];
    expect(remainingSessions(12, 'p', s)).toBe(11);
  });
  it('can go negative (PT allowed to overbook)', () => {
    expect(
      remainingSessions(0, 'p', [mk({ status: 'done', studentSigned: true, packageId: 'p' })]),
    ).toBe(-1);
  });
});
