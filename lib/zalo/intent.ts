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
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const MAX_WORDS = 4;

/**
 * Deliberately strict: a reply only counts when it STARTS with a keyword and is short.
 * Anything chatty ("em Huy đây", "không huỷ đâu") is 'unknown' and never changes a session.
 */
export function classifyReply(text: string): Reply {
  const t = strip(text);
  const words = t.split(' ').filter(Boolean);
  if (words.length === 0) return 'unknown';
  if (/^[0-9a-f]{6}$/.test(t)) return 'code';
  if (words.length > MAX_WORDS) return 'unknown';
  const head = t.replace(/^(em |minh |toi |anh |chi )?(xin )?/, '');
  if (/^(huy|cancel)\b/.test(head)) return 'cancel';
  if (/^(ok|oke|xac nhan|dong y|yes)\b/.test(head)) return 'confirm';
  return 'unknown';
}
