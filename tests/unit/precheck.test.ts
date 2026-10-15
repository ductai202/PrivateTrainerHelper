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

describe('precheck push (90 minutes before a session)', () => {
  const s = ns({ id: 'p1', ptId: 'pt', startAt: at('17:00'), endAt: at('18:00'), status: 'confirmed' });

  it('fires once the session is within 90 minutes', () => {
    const out = collectNotifications(at('15:30'), { ...base, sessions: [s] });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      memberId: 'pt',
      kind: 'precheck',
      sessionId: 'p1',
      url: '/sessions/p1',
    });
    expect(out[0].title).toContain('17:00');
    expect(out[0].title).toContain('Lan');
  });

  it('does not fire earlier than 90 minutes', () => {
    expect(collectNotifications(at('15:29'), { ...base, sessions: [s] })).toEqual([]);
  });

  it('does not fire again once pushed', () => {
    const pushed = { ...s, precheckPushedAt: at('15:35') };
    expect(collectNotifications(at('16:00'), { ...base, sessions: [pushed] })).toEqual([]);
  });

  it('does not fire for a session that already started', () => {
    expect(collectNotifications(at('17:01'), { ...base, sessions: [s] })).toEqual([]);
  });

  it.each(['cancelled', 'done', 'no_show'] as const)('skips %s sessions', (status) => {
    expect(collectNotifications(at('16:00'), { ...base, sessions: [{ ...s, status }] })).toEqual([]);
  });

  it('fires for scheduled (unconfirmed) sessions too', () => {
    const sched = { ...s, status: 'scheduled' as const };
    expect(collectNotifications(at('16:00'), { ...base, sessions: [sched] })).toHaveLength(1);
  });
});

describe('per-PT evening review time', () => {
  const data = { ...base, tomorrowCountByPt: { a: 2, b: 2 }, remindedTomorrowByPt: {} };

  it('uses 22:00 when the PT has no preference', () => {
    expect(collectNotifications(at('21:59'), data)).toEqual([]);
    expect(collectNotifications(at('22:00'), data).map((n) => n.memberId).sort()).toEqual(['a', 'b']);
  });

  it('honours each PT preference', () => {
    const withTimes = { ...data, reviewTimeByPt: { a: '19:30', b: '21:15' } };
    expect(collectNotifications(at('19:29'), withTimes)).toEqual([]);
    expect(collectNotifications(at('19:30'), withTimes).map((n) => n.memberId)).toEqual(['a']);
    expect(collectNotifications(at('21:14'), { ...withTimes, pushLog: [{ memberId: 'a', kind: 'tomorrow', forDate: '2026-10-20' }] })).toEqual([]);
    expect(collectNotifications(at('21:15'), { ...withTimes, pushLog: [{ memberId: 'a', kind: 'tomorrow', forDate: '2026-10-20' }] }).map((n) => n.memberId)).toEqual(['b']);
  });
});
