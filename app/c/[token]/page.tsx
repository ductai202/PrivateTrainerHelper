import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { linkSecret, verifySessionToken } from '@/lib/links/token';
import { studentRespond } from '@/lib/links/sessionActions';
import { vnDateLabel, vnHHmm } from '@/lib/time';

async function respond(token: string, action: 'confirm' | 'cancel', form: FormData) {
  'use server';
  if (!linkSecret()) return;
  const id = verifySessionToken(token, linkSecret());
  if (!id) return;
  const { data: live } = await createAdminSupabase()
    .from('sessions')
    .select('link_revoked_at')
    .eq('id', id)
    .maybeSingle();
  if (!live || live.link_revoked_at) return;
  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  await studentRespond(id, action, String(form.get('reason') ?? '').trim(), origin);
  revalidatePath(`/c/${token}`);
}

export default async function StudentLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const id = linkSecret() ? verifySessionToken(token, linkSecret()) : null;
  if (!id) return <main className="p-4">Liên kết không hợp lệ hoặc đã hết hạn.</main>;

  const db = createAdminSupabase();
  const { data: s } = await db
    .from('sessions')
    .select('status, start_at, end_at, link_revoked_at, students(full_name), members!sessions_pt_id_fkey(display_name)')
    .eq('id', id)
    .maybeSingle();
  if (!s) return <main className="p-4">Không tìm thấy buổi tập.</main>;
  if (s.link_revoked_at) {
    return <main className="p-4">Liên kết không hợp lệ hoặc đã hết hạn.</main>;
  }

  const start = new Date(s.start_at);
  const end = new Date(s.end_at);
  const open = (s.status === 'scheduled' || s.status === 'confirmed') && start > new Date();
  const student = (s.students as { full_name: string } | null)?.full_name;
  const pt = (s.members as { display_name: string } | null)?.display_name;

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-semibold">Lịch tập của {student}</h1>
      <p>
        PT {pt} · {vnDateLabel(start)} · {vnHHmm(start)}–{vnHHmm(end)}
      </p>
      <p data-testid="link-status">
        {s.status === 'confirmed' && 'Bạn đã xác nhận buổi này.'}
        {s.status === 'cancelled' && 'Buổi này đã được huỷ.'}
        {s.status === 'scheduled' && 'Buổi tập đang chờ bạn xác nhận.'}
        {(s.status === 'done' || s.status === 'no_show') && 'Buổi này đã kết thúc.'}
      </p>
      {open && (
        <div className="space-y-3">
          <form action={respond.bind(null, token, 'confirm')}>
            <button className="min-h-12 w-full rounded bg-teal-700 font-medium text-white">Xác nhận</button>
          </form>
          <form action={respond.bind(null, token, 'cancel')} className="space-y-2">
            <input
              name="reason"
              placeholder="Lý do huỷ (không bắt buộc)"
              className="min-h-12 w-full rounded border px-3"
            />
            <button className="min-h-12 w-full rounded border font-medium text-red-700">Huỷ buổi</button>
          </form>
        </div>
      )}
    </main>
  );
}
