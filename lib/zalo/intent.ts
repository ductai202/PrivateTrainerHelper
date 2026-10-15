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

/** Delivery id Zalo may resend; used to process each update once. Null when absent. */
export function parseUpdateId(update: unknown): string | null {
  const u = update as { update_id?: unknown; message?: { message_id?: unknown } } | null;
  const id = u?.update_id ?? u?.message?.message_id;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}

export type Reply = 'confirm' | 'cancel' | 'code' | 'stop' | 'unknown';

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
 * Deliberately strict: a reply only counts when it is short and starts with a keyword.
 * Anything chatty ("em Huy đây", "không huỷ đâu", "bạn ơi") is 'unknown' and never changes a session.
 * "bận" is only accepted with its diacritic: without it, it is indistinguishable from "bạn".
 */
export function classifyReply(text: string): Reply {
  const t = strip(text);
  const words = t.split(' ').filter(Boolean);
  if (words.length === 0) return 'unknown';
  if (/^[0-9a-f]{6}$/.test(t)) return 'code';
  if (words.length > MAX_WORDS) return 'unknown';

  const head = t.replace(/^(em |minh |toi |anh |chi )?(xin )?/, '');
  if (/^(stop|dung|ngat ket noi|huy ket noi)\b/.test(head)) return 'stop';
  if (/^(huy|cancel)\b/.test(head)) return 'cancel';
  if (/^(ok|oke|xac nhan|dong y|yes)\b/.test(head)) return 'confirm';

  const raw = text.toLowerCase().normalize('NFC');
  const negated = /(^|[^\p{L}])(không|khong)([^\p{L}]|$)/u.test(raw);
  if (!negated && (/(^|[^\p{L}])bận([^\p{L}]|$)/u.test(raw) || /^busy\b/.test(head))) return 'cancel';
  return 'unknown';
}
