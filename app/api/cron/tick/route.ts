import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { collectNotifications, PRECHECK_MINUTES, type NotifSession } from '@/lib/cron/collectNotifications';
import { sendPush, pushConfigured } from '@/lib/push/send';
import { vnDateIso, vnDayRange, vnHHmm } from '@/lib/time';
import { botConfigured, sendBotMessage } from '@/lib/zalo/botClient';
import { linkSecret, signSessionToken } from '@/lib/links/token';
import { reminderMessage } from '@/lib/domain/messages';
import type { SessionStatus } from '@/lib/domain/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const db = createAdminSupabase();
  const today = vnDayRange(now);
  const tomorrow = vnDayRange(new Date(today.end.getTime() + 1000));

  // Look ahead past midnight: a 00:30 session must still get its 90-minute precheck at 23:00.
  const horizon = new Date(Math.max(today.end.getTime(), now.getTime() + PRECHECK_MINUTES * 60_000));

  const { data: todays } = await db
    .from('sessions')
    .select('id, pt_id, student_id, package_id, start_at, end_at, status, student_signed, workout_logged, checklist_pushed_at, checklist_reminded_at, precheck_pushed_at, students(full_name)')
    .gte('start_at', today.start.toISOString())
    .lt('start_at', horizon.toISOString());

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
    precheckPushedAt: r.precheck_pushed_at ? new Date(r.precheck_pushed_at) : null,
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

  const { data: pts } = await db.from('members').select('id, evening_review_time').eq('role', 'pt');
  const reviewTimeByPt: Record<string, string> = {};
  for (const p of pts ?? []) reviewTimeByPt[p.id] = p.evening_review_time.slice(0, 5);

  const due = collectNotifications(now, {
    reviewTimeByPt,
    sessions,
    tomorrowCountByPt,
    remindedTomorrowByPt,
    pushLog: (log ?? []).map((l) => ({ memberId: l.member_id, kind: l.kind, forDate: l.for_date })),
  });

  let sent = 0;
  for (const n of pushConfigured() ? due : []) {
    sent += await sendPush(n.memberId, { title: n.title, body: n.body, url: n.url });
    if (n.kind === 'checklist' && n.sessionId) {
      await db.from('sessions').update({ checklist_pushed_at: now.toISOString() }).eq('id', n.sessionId);
    } else if (n.kind === 'precheck' && n.sessionId) {
      await db.from('sessions').update({ precheck_pushed_at: now.toISOString() }).eq('id', n.sessionId);
    } else {
      await db.from('push_log').upsert(
        { member_id: n.memberId, kind: n.kind, for_date: forDate },
        { onConflict: 'member_id,kind,for_date', ignoreDuplicates: true },
      );
    }
  }
  const botSent = await sendBotReminders(db, now, tomorrow, request);
  const botPrechecks = await sendBotPrechecks(db, now);
  return NextResponse.json({ sent, due: due.length, botSent, botPrechecks });
}

/** From 18:00 VN, reminds (once) the students of tomorrow's sessions who connected the Zalo Bot. */
async function sendBotReminders(
  db: ReturnType<typeof createAdminSupabase>,
  now: Date,
  tomorrow: { start: Date; end: Date },
  request: Request,
): Promise<number> {
  if (!botConfigured() || vnHHmm(now) < '18:00') return 0;
  const { data } = await db
    .from('sessions')
    .select('id, student_id, start_at, students!inner(full_name, zalo_bot_chat_id), members!sessions_pt_id_fkey(display_name)')
    .neq('status', 'cancelled')
    .gte('start_at', tomorrow.start.toISOString())
    .lt('start_at', tomorrow.end.toISOString());
  const rows = (data ?? []).filter(
    (r) => (r.students as { zalo_bot_chat_id: string | null }).zalo_bot_chat_id,
  );
  if (rows.length === 0) return 0;
  const { data: done } = await db
    .from('message_log')
    .select('session_id')
    .eq('kind', 'reminder')
    .eq('channel', 'bot')
    .in('session_id', rows.map((r) => r.id));
  const already = new Set((done ?? []).map((d) => d.session_id));

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const secret = linkSecret();
  let n = 0;
  for (const r of rows) {
    if (already.has(r.id)) continue;
    const st = r.students as { full_name: string; zalo_bot_chat_id: string };
    const text = reminderMessage({
      studentName: st.full_name,
      ptName: (r.members as { display_name: string } | null)?.display_name ?? '',
      startAt: new Date(r.start_at),
      link: secret ? `${origin}/c/${signSessionToken(r.id, secret)}` : undefined,
    });
    if (!(await sendBotMessage(st.zalo_bot_chat_id, text))) continue;
    const { data: sess } = await db.from('sessions').select('gym_id').eq('id', r.id).single();
    await db.from('message_log').insert({
      gym_id: sess!.gym_id,
      session_id: r.id,
      student_id: r.student_id,
      channel: 'bot',
      kind: 'reminder',
      content: text,
    });
    n += 1;
  }
  return n;
}

const BOT_PRECHECK_MINUTES = 120;

/**
 * Two hours before a session, asks a bot-connected student "still coming?" (once per session).
 * The question is logged so that their next "OK" / "Bận" is applied to this very session.
 */
async function sendBotPrechecks(
  db: ReturnType<typeof createAdminSupabase>,
  now: Date,
): Promise<number> {
  if (!botConfigured()) return 0;
  const until = new Date(now.getTime() + BOT_PRECHECK_MINUTES * 60_000);
  const { data } = await db
    .from('sessions')
    .select('id, gym_id, student_id, start_at, students!inner(full_name, zalo_bot_chat_id)')
    .in('status', ['scheduled', 'confirmed'])
    .is('bot_precheck_sent_at', null)
    .gt('start_at', now.toISOString())
    .lte('start_at', until.toISOString());

  let n = 0;
  for (const r of data ?? []) {
    const st = r.students as { full_name: string; zalo_bot_chat_id: string | null };
    if (!st.zalo_bot_chat_id) continue;
    const text = `Chào ${st.full_name}, bạn vẫn tập lúc ${vnHHmm(new Date(r.start_at))} chứ? Trả lời "OK" để xác nhận hoặc "Bận" nếu không tập được nhé.`;
    if (!(await sendBotMessage(st.zalo_bot_chat_id, text))) continue;
    await db.from('sessions').update({ bot_precheck_sent_at: now.toISOString() }).eq('id', r.id);
    await db.from('message_log').insert({
      gym_id: r.gym_id,
      session_id: r.id,
      student_id: r.student_id,
      channel: 'bot',
      kind: 'precheck',
      content: text,
    });
    n += 1;
  }
  return n;
}
