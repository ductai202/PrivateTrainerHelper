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

import { remainingAcrossPackages } from '@/lib/domain/packages';

describe('remainingAcrossPackages', () => {
  it('pools every package and every done+signed session, whatever package it was booked on', () => {
    const s = [
      mk({ status: 'done', studentSigned: true, packageId: 'old' }),
      mk({ status: 'done', studentSigned: true, packageId: 'old' }),
      mk({ status: 'done', studentSigned: true, packageId: 'new' }),
      mk({ status: 'done', studentSigned: false, packageId: 'new' }),
      mk({ status: 'scheduled', packageId: 'old' }),
    ];
    expect(remainingAcrossPackages([10, 12], s)).toBe(19);
  });
  it('is zero-safe with no packages', () => {
    expect(remainingAcrossPackages([], [])).toBe(0);
  });
});
