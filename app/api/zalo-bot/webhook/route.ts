import { randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { classifyReply, parseBotUpdate } from '@/lib/zalo/intent';
import { sendBotMessage } from '@/lib/zalo/botClient';
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
  const msg = parseBotUpdate(await request.json().catch(() => null));
  if (!msg) return NextResponse.json({ ok: true });

  const db = createAdminSupabase();
  const kind = classifyReply(msg.text);

  if (kind === 'code') {
    const { data: student } = await db
      .from('students')
      .select('id, full_name')
      .eq('bot_link_code', msg.text.trim().toUpperCase())
      .maybeSingle();
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
      `Đã kết nối với PT, chào ${student.full_name}! Khi nhận nhắc lịch bạn trả lời "OK" để xác nhận hoặc "Huỷ" để huỷ buổi.`,
    );
    return NextResponse.json({ ok: true, linked: true });
  }

  const { data: student } = await db
    .from('students')
    .select('id')
    .eq('zalo_bot_chat_id', msg.chatId)
    .maybeSingle();
  if (!student) {
    await sendBotMessage(msg.chatId, 'Bạn nhập mã kết nối PT đã gửi để bắt đầu nhé.');
    return NextResponse.json({ ok: true, linked: false });
  }
  if (kind === 'unknown') {
    await sendBotMessage(msg.chatId, 'Trả lời "OK" để xác nhận hoặc "Huỷ" để huỷ buổi sắp tới nhé.');
    return NextResponse.json({ ok: true });
  }

  // act only on the session this student was last reminded about via the bot
  const { data: lastReminder } = await db
    .from('message_log')
    .select('session_id')
    .eq('student_id', student.id)
    .eq('channel', 'bot')
    .eq('kind', 'reminder')
    .not('session_id', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const next = lastReminder?.session_id ? { id: lastReminder.session_id } : null;
  if (!next) {
    await sendBotMessage(msg.chatId, 'Hiện chưa có buổi nào cần xác nhận.');
    return NextResponse.json({ ok: true });
  }
  const result = await studentRespond(next.id, kind === 'confirm' ? 'confirm' : 'cancel', '');
  await sendBotMessage(
    msg.chatId,
    result === 'confirmed' ? 'Đã xác nhận buổi tập. Hẹn gặp bạn!' : result === 'cancelled' ? 'Đã huỷ buổi tập, PT sẽ được báo.' : 'Không thể thay đổi buổi này.',
  );
  return NextResponse.json({ ok: true, result });
}
