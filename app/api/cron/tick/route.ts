import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { collectNotifications, type NotifSession } from '@/lib/cron/collectNotifications';
import { sendPush, pushConfigured } from '@/lib/push/send';
import { vnDateIso, vnDayRange } from '@/lib/time';
import type { SessionStatus } from '@/lib/domain/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!pushConfigured()) return NextResponse.json({ sent: 0, reason: 'push not configured' });

  const now = new Date();
  const db = createAdminSupabase();
  const today = vnDayRange(now);
  const tomorrow = vnDayRange(new Date(today.end.getTime() + 1000));

  const { data: todays } = await db
    .from('sessions')
    .select('id, pt_id, student_id, package_id, start_at, end_at, status, student_signed, workout_logged, checklist_pushed_at, checklist_reminded_at, students(full_name)')
    .gte('start_at', today.start.toISOString())
    .lt('start_at', today.end.toISOString());

  const sessions: NotifSession[] = (todays ?? []).map((r) => ({
    id: r.id,
    ptId: r.pt_id,
    studentId: r.student_id,
    packageId: r.package_id,
    startAt: new Date(r.start_at),
    endAt: new Date(r.end_at),
    status: r.status as SessionStatus,
    studentSigned: r.student_signed,
    workoutLogged: r.workout_logged,
    checklistPushedAt: r.checklist_pushed_at ? new Date(r.checklist_pushed_at) : null,
    checklistRemindedAt: r.checklist_reminded_at ? new Date(r.checklist_reminded_at) : null,
    studentName: (r.students as { full_name: string } | null)?.full_name ?? '',
  }));

  const { data: tom } = await db
    .from('sessions')
    .select('id, pt_id')
    .neq('status', 'cancelled')
    .gte('start_at', tomorrow.start.toISOString())
    .lt('start_at', tomorrow.end.toISOString());
  const tomIds = (tom ?? []).map((t) => t.id);
  const { data: reminded } = tomIds.length
    ? await db.from('message_log').select('session_id').eq('kind', 'reminder').in('session_id', tomIds)
    : { data: [] };
  const remindedSet = new Set((reminded ?? []).map((r) => r.session_id));
  const tomorrowCountByPt: Record<string, number> = {};
  const remindedTomorrowByPt: Record<string, number> = {};
  for (const t of tom ?? []) {
    tomorrowCountByPt[t.pt_id] = (tomorrowCountByPt[t.pt_id] ?? 0) + 1;
    if (remindedSet.has(t.id)) remindedTomorrowByPt[t.pt_id] = (remindedTomorrowByPt[t.pt_id] ?? 0) + 1;
  }

  const forDate = vnDateIso(now);
  const { data: log } = await db.from('push_log').select('member_id, kind, for_date').eq('for_date', forDate);

  const due = collectNotifications(now, {
    sessions,
    tomorrowCountByPt,
    remindedTomorrowByPt,
    pushLog: (log ?? []).map((l) => ({ memberId: l.member_id, kind: l.kind, forDate: l.for_date })),
  });

  let sent = 0;
  for (const n of due) {
    sent += await sendPush(n.memberId, { title: n.title, body: n.body, url: n.url });
    if (n.kind === 'checklist' && n.sessionId) {
      await db.from('sessions').update({ checklist_pushed_at: now.toISOString() }).eq('id', n.sessionId);
    } else {
      await db.from('push_log').upsert(
        { member_id: n.memberId, kind: n.kind, for_date: forDate },
        { onConflict: 'member_id,kind,for_date', ignoreDuplicates: true },
      );
    }
  }
  return NextResponse.json({ sent, due: due.length });
}
