import { describe, it, expect } from 'vitest';
import { collectNotifications, type NotifSession } from '@/lib/cron/collectNotifications';
import { at, mk } from './helpers';

function ns(p: Partial<NotifSession> = {}): NotifSession {
  return {
    ...mk(p),
    checklistPushedAt: null,
    checklistRemindedAt: null,
    precheckPushedAt: null,
    studentName: 'Lan',
    ...p,
  };
}
const base = { sessions: [], tomorrowCountByPt: {}, remindedTomorrowByPt: {}, pushLog: [] };

describe('collectNotifications', () => {
  it('pushes checklist once per finished session', () => {
    const s = ns({ id: 'x', ptId: 'pt', endAt: at('09:00'), status: 'scheduled' });
    const out = collectNotifications(at('10:00'), { ...base, sessions: [s] });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ memberId: 'pt', kind: 'checklist', sessionId: 'x', url: '/sessions/x' });
    const again = collectNotifications(at('10:00'), {
      ...base,
      sessions: [{ ...s, checklistPushedAt: at('09:30') }],
    });
    expect(again).toEqual([]);
  });

  it('end-of-day nudge fires from 21:00, once per day', () => {
    const s = ns({ ptId: 'pt', endAt: at('09:00'), status: 'scheduled', checklistPushedAt: at('09:10') });
    expect(collectNotifications(at('20:59'), { ...base, sessions: [s] })).toEqual([]);
    const out = collectNotifications(at('21:00'), { ...base, sessions: [s] });
    expect(out.map((n) => n.kind)).toEqual(['checklist_eod']);
    const done = collectNotifications(at('21:30'), {
      ...base,
      sessions: [s],
      pushLog: [{ memberId: 'pt', kind: 'checklist_eod', forDate: '2026-10-20' }],
    });
    expect(done).toEqual([]);
  });

  it('tomorrow reminder from 20:00 only when something is un-reminded', () => {
    const d = { ...base, tomorrowCountByPt: { pt: 3 }, remindedTomorrowByPt: { pt: 1 } };
    expect(collectNotifications(at('19:59'), d)).toEqual([]);
    const out = collectNotifications(at('20:00'), d);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'tomorrow', url: '/reminders' });
    expect(out[0].body).toContain('2');
    expect(
      collectNotifications(at('20:00'), { ...d, remindedTomorrowByPt: { pt: 3 } }),
    ).toEqual([]);
  });
});
