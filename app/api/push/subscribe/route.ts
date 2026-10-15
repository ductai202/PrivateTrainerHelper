import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sub = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: 'invalid subscription' }, { status: 400 });
  }
  const { data: member } = await supabase
    .from('members')
    .select('id, gym_id')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: 'no member' }, { status: 403 });

  // The endpoint identifies a physical device: when it changes hands the row must move to the
  // new member, which RLS (own rows only) cannot do. The caller was authenticated above.
  const { error } = await createAdminSupabase().from('push_subscriptions').upsert(
    {
      gym_id: member.gym_id,
      member_id: member.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: 'endpoint' },
  );
  if (error) return NextResponse.json({ error: 'save failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
