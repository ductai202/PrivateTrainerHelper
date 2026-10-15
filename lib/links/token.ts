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

/**
 * Personal link for one student (`/s/<token>`): `<base64url(json)>.<hmac>`.
 * Carries a version so the PT can revoke every link by bumping `students.link_version`,
 * and an expiry so an old link stops working on its own.
 */
export function signStudentToken(
  studentId: string,
  version: number,
  expiresAt: Date,
  secret: string,
): string {
  const payload = b64(JSON.stringify({ k: 's', id: studentId, v: version, exp: expiresAt.getTime() }));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyStudentToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): { studentId: string; version: number } | null {
  const [payload, sig, extra] = token.split('.');
  if (!payload || !sig || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      k?: string;
      id?: string;
      v?: number;
      exp?: number;
    };
    if (p.k !== 's' || typeof p.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(p.id)) return null;
    if (typeof p.v !== 'number' || typeof p.exp !== 'number' || p.exp <= now.getTime()) return null;
    return { studentId: p.id, version: p.v };
  } catch {
    return null;
  }
}

export function linkSecret(): string {
  return process.env.LINK_SECRET ?? process.env.CRON_SECRET ?? '';
}
