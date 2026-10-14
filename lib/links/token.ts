import { createHmac, timingSafeEqual } from 'node:crypto';

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const sign = (payload: string, secret: string) =>
  createHmac('sha256', secret).update(payload).digest('base64url');

/** `<base64url(sessionId)>.<hmac>` — lets a student act on one session without logging in. */
export function signSessionToken(sessionId: string, secret: string): string {
  const payload = b64(sessionId);
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string, secret: string): string | null {
  const [payload, sig, extra] = token.split('.');
  if (!payload || !sig || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const id = Buffer.from(payload, 'base64url').toString('utf8');
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

export function linkSecret(): string {
  return process.env.LINK_SECRET ?? process.env.CRON_SECRET ?? '';
}
