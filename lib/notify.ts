import { createAdminSupabase } from '@/lib/supabase/admin';
import { sendPush, type PushPayload } from '@/lib/push/send';
import { botConfigured, sendBotMessage } from '@/lib/zalo/botClient';

/** Plain-text version of a notification for a Zalo chat, with a deep link when we know the app URL. */
export function formatBotNotification(p: PushPayload, origin?: string): string {
  const lines = [p.title, p.body];
  if (origin) lines.push(`${origin.replace(/\/+$/, '')}${p.url}`);
  return lines.join('\n');
}

/**
 * Tells a PT about something that needs them, on every channel they set up:
 * Web Push (installed web app) and/or their own Zalo chat with the bot.
 */
export async function notifyMember(
  memberId: string,
  payload: PushPayload,
  opts: { origin?: string } = {},
): Promise<{ push: number; bot: boolean }> {
  const push = await sendPush(memberId, payload);

  let bot = false;
  if (botConfigured()) {
    const { data } = await createAdminSupabase()
      .from('members')
      .select('zalo_bot_chat_id')
      .eq('id', memberId)
      .maybeSingle();
    if (data?.zalo_bot_chat_id) {
      const origin = opts.origin ?? process.env.NEXT_PUBLIC_APP_URL;
      bot = await sendBotMessage(data.zalo_bot_chat_id, formatBotNotification(payload, origin));
    }
  }
  return { push, bot };
}
