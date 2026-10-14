export interface BotMessage {
  chatId: string;
  text: string;
}

/** Pulls the chat id and text out of a Zalo Bot update; null when it carries no text. */
export function parseBotUpdate(update: unknown): BotMessage | null {
  const msg = (update as { message?: { chat?: { id?: unknown }; text?: unknown } } | null)?.message;
  const id = msg?.chat?.id;
  const text = typeof msg?.text === 'string' ? msg.text.trim() : '';
  if ((typeof id !== 'string' && typeof id !== 'number') || !text) return null;
  return { chatId: String(id), text };
}

export type Reply = 'confirm' | 'cancel' | 'code' | 'unknown';

const strip = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();

export function classifyReply(text: string): Reply {
  const t = strip(text.trim());
  if (/\b(huy|cancel|nghi)\b/.test(t)) return 'cancel';
  if (/\b(ok|oke|xac nhan|dong y|yes)\b/.test(t)) return 'confirm';
  if (/^[0-9a-f]{6}$/.test(t)) return 'code';
  return 'unknown';
}
