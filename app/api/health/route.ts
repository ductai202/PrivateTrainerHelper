import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Liveness + database check, public and free of data. Also gives the project a real database
 * request each time it is called, which keeps a free Supabase project from being paused.
 */
export async function GET() {
  const at = new Date().toISOString();
  const { error } = await createAdminSupabase().from('gyms').select('id', { head: true, count: 'exact' });
  if (error) return NextResponse.json({ ok: false, db: false, at }, { status: 503 });
  return NextResponse.json({ ok: true, db: true, at });
}
