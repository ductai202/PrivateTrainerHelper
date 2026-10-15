import { NextResponse } from 'next/server';
import { requestReschedule } from '@/lib/student/portal';

export const dynamic = 'force-dynamic';

/** Student asks the PT to move one of their sessions to a free slot. Auth = personal link token. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
    sessionId?: unknown;
    start?: unknown;
  } | null;
  if (
    !body ||
    typeof body.token !== 'string' ||
    typeof body.sessionId !== 'string' ||
    typeof body.start !== 'string'
  ) {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
  const r = await requestReschedule(body.token, body.sessionId, body.start);
  return NextResponse.json(r.error ? { error: r.error } : { ok: true }, { status: r.status });
}
