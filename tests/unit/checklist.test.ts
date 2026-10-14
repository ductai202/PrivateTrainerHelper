import { describe, it, expect } from 'vitest';
import { pendingChecklist, needsChecklistPush } from '@/lib/domain/checklist';
import { mk, at } from './helpers';

describe('checklist', () => {
  const now = at('10:00');
  it('pending items', () => {
    expect(pendingChecklist(mk({ status: 'scheduled', endAt: at('09:00') }), now)).toEqual([
      'outcome',
      'sign',
      'workout',
    ]);
    expect(
      pendingChecklist(
        mk({ status: 'done', studentSigned: true, workoutLogged: false, endAt: at('09:00') }),
        now,
      ),
    ).toEqual(['workout']);
    expect(pendingChecklist(mk({ status: 'no_show', endAt: at('09:00') }), now)).toEqual([]);
    expect(pendingChecklist(mk({ status: 'cancelled', endAt: at('09:00') }), now)).toEqual([]);
  });
  it('push only after session ended', () => {
    expect(needsChecklistPush(mk({ status: 'scheduled', endAt: at('11:00') }), now)).toBe(false);
    expect(needsChecklistPush(mk({ status: 'scheduled', endAt: at('09:00') }), now)).toBe(true);
  });
});
