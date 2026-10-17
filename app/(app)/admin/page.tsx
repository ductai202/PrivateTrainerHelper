import { redirect } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { createServerSupabase } from '@/lib/supabase/server';
import CenterOwnerForm from './CenterOwnerForm';
import CreateCenterForm from './CreateCenterForm';
import OpenCenterButton from './OpenCenterButton';

function monthStartVn(now = new Date()): Date {
  const vn = new Date(now.getTime() + 7 * 3600_000);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), 1) - 7 * 3600_000);
}

export default async function AdminPage() {
  const member = await getCurrentMember();
  if (!member.isPlatformAdmin) redirect('/today');

  const supabase = await createServerSupabase();
  const ids = member.centers.map((c) => c.gymId);
  const [{ data: pts }, { data: students }, { data: sessions }] = await Promise.all([
    supabase.from('members').select('gym_id').eq('role', 'pt').in('gym_id', ids),
    supabase.from('students').select('gym_id').eq('archived', false).in('gym_id', ids),
    supabase
      .from('sessions')
      .select('gym_id, status')
      .in('gym_id', ids)
      .gte('start_at', monthStartVn().toISOString()),
  ]);
  const count = <T extends { gym_id: string }>(rows: T[] | null, gym: string, keep?: (r: T) => boolean) =>
    (rows ?? []).filter((r) => r.gym_id === gym && (!keep || keep(r))).length;

  return (
    <main className="space-y-5 p-4">
      <div>
        <h1 className="text-xl font-semibold">Các trung tâm</h1>
        <p className="text-sm text-slate-600">
          Bạn là admin: xem và chỉnh sửa mọi trung tâm bên dưới. Bấm “Mở trung tâm” để làm việc trong
          trung tâm đó (PT, học viên, lịch, báo cáo).
        </p>
      </div>

      <ul className="space-y-3">
        {member.centers.map((c) => (
          <li
            key={c.gymId}
            data-testid="center-card"
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Building2 size={18} aria-hidden className="text-teal-700" />
              <h2 className="flex-1 font-semibold">{c.name}</h2>
              {c.gymId === member.gymId ? (
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
                  Đang xem
                </span>
              ) : (
                <OpenCenterButton gymId={c.gymId} />
              )}
            </div>
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700">
              <div>PT: {count(pts, c.gymId)}</div>
              <div>Học viên: {count(students, c.gymId)}</div>
              <div>
                Buổi tháng này: {count(sessions, c.gymId, (s) => s.status !== 'cancelled')}
              </div>
            </dl>
            <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-medium">Tạo chủ trung tâm</summary>
              <div className="pt-3">
                <CenterOwnerForm gymId={c.gymId} />
              </div>
            </details>
          </li>
        ))}
      </ul>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Tạo trung tâm mới</h2>
        <CreateCenterForm />
      </section>
    </main>
  );
}
