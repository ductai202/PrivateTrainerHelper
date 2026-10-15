import { randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { classifyReply, parseBotUpdate, parseUpdateId } from '@/lib/zalo/intent';
import { sendBotMessage } from '@/lib/zalo/botClient';
import { isRateLimited } from '@/lib/zalo/rateLimit';
import { studentRespond } from '@/lib/links/sessionActions';

export const dynamic = 'force-dynamic';

function secretOk(header: string | null): boolean {
  const secret = process.env.ZALO_BOT_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretOk(request.headers.get('x-bot-api-secret-token'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const msg = parseBotUpdate(body);
  if (!msg) return NextResponse.json({ ok: true });

  const db = createAdminSupabase();

  // Zalo may redeliver an update: handle each delivery id once.
  const updateId = parseUpdateId(body);
  if (updateId) {
    const { error } = await db.from('bot_updates').insert({ update_id: updateId });
    if (error?.code === '23505') return NextResponse.json({ ok: true, duplicate: true });
  }

  const kind = classifyReply(msg.text);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  if (kind === 'code') {
    // brute-force guard: a handful of tries per chat per 10 minutes
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: attempts } = await db
      .from('bot_link_attempts')
      .select('attempted_at')
      .eq('chat_id', msg.chatId)
      .gt('attempted_at', since);
    const times = (attempts ?? []).map((a) => new Date(a.attempted_at));
    if (isRateLimited(times, new Date())) {
      await sendBotMessage(msg.chatId, 'Bạn đã nhập sai nhiều lần, hãy thử lại sau 10 phút nhé.');
      return NextResponse.json({ ok: true, linked: false, limited: true });
    }
    await db.from('bot_link_attempts').insert({ chat_id: msg.chatId });

    const code = msg.text.trim().toUpperCase();
    const { data: student } = await db
      .from('students')
      .select('id, full_name')
      .eq('bot_link_code', code)
      .maybeSingle();
    if (!student) {
      // not a student code: maybe a PT connecting their own chat
      const { data: pt } = await db
        .from('members')
        .select('id, display_name')
        .eq('bot_link_code', code)
        .maybeSingle();
      if (pt) {
        const { error: ptError } = await db
          .from('members')
          .update({
            zalo_bot_chat_id: msg.chatId,
            bot_link_code: randomBytes(3).toString('hex').toUpperCase(),
          })
          .eq('id', pt.id);
        if (ptError) {
          await sendBotMessage(msg.chatId, 'Không kết nối được. Chat này có thể đã kết nối với tài khoản khác.');
          return NextResponse.json({ ok: true, linked: false });
        }
        await sendBotMessage(
          msg.chatId,
          `Đã kết nối cho PT ${pt.display_name}. Khi học viên xác nhận, huỷ hoặc xin đổi giờ, bạn sẽ nhận tin ở đây.`,
        );
        return NextResponse.json({ ok: true, linked: true, role: 'pt' });
      }
    }
    if (!student) {
      await sendBotMessage(msg.chatId, 'Mã kết nối không đúng. Bạn nhờ PT gửi lại mã giúp mình nhé.');
      return NextResponse.json({ ok: true, linked: false });
    }
    const { error: linkError } = await db
      .from('students')
      .update({
        zalo_bot_chat_id: msg.chatId,
        // single-use: rotate so a leaked or old code cannot rebind the chat
        bot_link_code: randomBytes(3).toString('hex').toUpperCase(),
      })
      .eq('id', student.id);
    if (linkError) {
      await sendBotMessage(msg.chatId, 'Không kết nối được. Chat này có thể đã kết nối với học viên khác.');
      return NextResponse.json({ ok: true, linked: false });
    }
    await sendBotMessage(
      msg.chatId,
      `Đã kết nối với PT, chào ${student.full_name}! Khi nhận nhắc lịch bạn trả lời "OK" để xác nhận hoặc "Bận" để báo không tập được.`,
    );
    return NextResponse.json({ ok: true, linked: true });
  }

  const { data: student } = await db
    .from('students')
    .select('id')
    .eq('zalo_bot_chat_id', msg.chatId)
    .maybeSingle();
  if (!student) {
    const { data: pt } = await db
      .from('members')
      .select('id')
      .eq('zalo_bot_chat_id', msg.chatId)
      .maybeSingle();
    if (pt) {
      if (kind === 'stop') {
        await db.from('members').update({ zalo_bot_chat_id: null }).eq('id', pt.id);
        await sendBotMessage(msg.chatId, 'Đã ngắt kết nối. Lấy mã mới trong Cài đặt của app nếu muốn kết nối lại.');
        return NextResponse.json({ ok: true, disconnected: true, role: 'pt' });
      }
      await sendBotMessage(msg.chatId, 'Mình sẽ báo cho bạn ở đây khi học viên xác nhận, huỷ hoặc xin đổi giờ. Nhắn "stop" để ngắt kết nối.');
      return NextResponse.json({ ok: true, role: 'pt' });
    }
    await sendBotMessage(msg.chatId, 'Bạn nhập mã kết nối PT đã gửi để bắt đầu nhé.');
    return NextResponse.json({ ok: true, linked: false });
  }

  if (kind === 'stop') {
    await db.from('students').update({ zalo_bot_chat_id: null }).eq('id', student.id);
    await sendBotMessage(msg.chatId, 'Đã ngắt kết nối. Bạn nhắn mã mới của PT nếu muốn kết nối lại.');
    return NextResponse.json({ ok: true, disconnected: true });
  }

  if (kind === 'unknown') {
    await sendBotMessage(msg.chatId, 'Trả lời "OK" để xác nhận hoặc "Bận" nếu không tập được nhé.');
    return NextResponse.json({ ok: true });
  }

  // act only on the session this student was last asked about via the bot
  const { data: lastAsked } = await db
    .from('message_log')
    .select('session_id')
    .eq('student_id', student.id)
    .eq('channel', 'bot')
    .in('kind', ['reminder', 'precheck'])
    .not('session_id', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lastAsked?.session_id) {
    await sendBotMessage(msg.chatId, 'Hiện chưa có buổi nào cần xác nhận.');
    return NextResponse.json({ ok: true });
  }

  const result = await studentRespond(
    lastAsked.session_id,
    kind === 'confirm' ? 'confirm' : 'cancel',
    '',
    origin,
  );
  await sendBotMessage(
    msg.chatId,
    result === 'confirmed'
      ? 'Đã xác nhận buổi tập. Hẹn gặp bạn!'
      : result === 'cancelled'
        ? 'Đã huỷ buổi tập, PT sẽ được báo.'
        : 'Không thể thay đổi buổi này.',
  );
  return NextResponse.json({ ok: true, result });
}
