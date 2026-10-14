/**
 * Minimal Zalo Bot Platform client (official API, Telegram-style).
 * The base URL is configurable because third-party docs disagree on the host; confirm it
 * against the official Zalo Bot Platform docs before going live.
 */
const BASE = () => process.env.ZALO_BOT_API_BASE ?? 'https://bot-api.zaloplatforms.com';

export function botConfigured(): boolean {
  return !!process.env.ZALO_BOT_TOKEN;
}

export async function sendBotMessage(chatId: string, text: string): Promise<boolean> {
  if (!botConfigured()) return false;
  try {
    const res = await fetch(`${BASE()}/bot${process.env.ZALO_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
