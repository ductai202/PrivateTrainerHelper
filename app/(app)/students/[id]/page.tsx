import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { remainingAcrossPackages } from '@/lib/domain/packages';
import type { SessionLite } from '@/lib/domain/types';
import { vnDateLabel } from '@/lib/time';
import ZaloButton from '@/components/ZaloButton';
import MeasurementChart from '@/components/MeasurementChart';
import { addMealPlan, addMeasurement, addPackage, updateStudentProfile } from './actions';

type Tab = 'profile' | 'progress' | 'nutrition' | 'workouts';
const TABS: [Tab, string][] = [
  ['profile', 'Hồ sơ'],
  ['progress', 'Tiến độ'],
  ['nutrition', 'Dinh dưỡng'],
  ['workouts', 'Bài tập'],
];
const input = 'min-h-12 w-full rounded border px-3';

function Field({ label, name, type = 'text' }: { label: string; name: string; type?: string }) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <input name={name} type={type} inputMode={type === 'text' ? 'decimal' : undefined} className={input} />
    </label>
  );
}

export default async function StudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = (TABS.find(([t]) => t === sp.tab)?.[0] ?? 'profile') as Tab;
  const supabase = await createServerSupabase();
  const valid = /^[0-9a-f-]{36}$/i.test(id);
  const { data: s } = valid
    ? await supabase.from('students').select('*').eq('id', id).maybeSingle()
    : { data: null };
  if (!s) return <main className="p-4">Không tìm thấy học viên</main>;

  const [{ data: pkgs }, { data: sessions }, { data: meas }, { data: notes }, { data: meals }] =
    await Promise.all([
      supabase.from('packages').select('*').eq('student_id', id).order('created_at', { ascending: false }),
      supabase.from('sessions').select('*').eq('student_id', id).order('start_at', { ascending: false }),
      supabase.from('body_measurements').select('*').eq('student_id', id).order('created_at', { ascending: false }),
      supabase.from('progress_notes').select('*').eq('student_id', id).order('created_at', { ascending: false }),
      supabase.from('meal_plans').select('*').eq('student_id', id).order('effective_from', { ascending: false }).order('created_at', { ascending: false }),
    ]);

  const pkg = pkgs?.[0];
  const remaining = pkg
    ? remainingAcrossPackages(
        (pkgs ?? []).map((p) => p.total_sessions),
        (sessions ?? []).map(
          (x) => ({ status: x.status, studentSigned: x.student_signed }) as SessionLite,
        ),
      )
    : null;
  const chartData = [...(meas ?? [])]
    .reverse()
    .map((m) => ({
      date: m.measured_on.slice(5),
      weight: m.weight_kg === null ? null : Number(m.weight_kg),
      waist: m.waist_cm === null ? null : Number(m.waist_cm),
    }));

  return (
    <main className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">{s.full_name}</h1>
      <nav className="flex gap-2 overflow-x-auto">
        {TABS.map(([t, label]) => (
          <Link
            key={t}
            href={`/students/${id}?tab=${t}`}
            className={`min-h-11 rounded px-3 py-2 text-sm ${t === tab ? 'bg-teal-700 text-white' : 'border'}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === 'profile' && (
        <section className="space-y-3">
          {s.birth_year && <p>Tuổi: {new Date().getFullYear() - s.birth_year}</p>}
          <p>Giới tính: {s.gender === 'female' ? 'Nữ' : s.gender === 'male' ? 'Nam' : '—'}</p>
          <p>{remaining === null ? 'Chưa có gói' : `Còn ${remaining} buổi`}</p>
          <p>Mục tiêu: {s.goal ?? '—'}</p>
          <p>Ghi chú sức khoẻ: {s.health_notes ?? '—'}</p>
          <ZaloButton phone={s.phone} />
          <p className="text-sm" data-testid="bot-status">
            {s.zalo_bot_chat_id
              ? 'Zalo Bot: đã kết nối'
              : `Zalo Bot: chưa kết nối — học viên nhắn mã ${s.bot_link_code} cho bot`}
          </p>
          <form action={updateStudentProfile.bind(null, id)} className="space-y-3 border-t pt-3">
            <h2 className="font-medium">Sửa hồ sơ</h2>
            <label className="block space-y-1 text-sm">
              <span>Mục tiêu</span>
              <input name="goal" defaultValue={s.goal ?? ''} className={input} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Chấn thương / ghi chú</span>
              <textarea name="health_notes" defaultValue={s.health_notes ?? ''} className={input} />
            </label>
            <button className="min-h-12 rounded bg-teal-700 px-4 text-white">Lưu hồ sơ</button>
          </form>
          <form action={addPackage.bind(null, id)} className="space-y-3 border-t pt-3">
            <h2 className="font-medium">Thêm gói mới</h2>
            <Field label="Số buổi trong gói mới" name="total_sessions" />
            <button className="min-h-12 rounded border px-4">Thêm gói</button>
          </form>
        </section>
      )}

      {tab === 'progress' && (
        <section className="space-y-4">
          {chartData.length > 0 && <MeasurementChart data={chartData} />}
          <form action={addMeasurement.bind(null, id)} className="space-y-3">
            <h2 className="font-medium">Cập nhật tình trạng</h2>
            <Field label="Cân nặng (kg)" name="weight_kg" />
            <Field label="Vòng ngực (cm)" name="chest_cm" />
            <Field label="Vòng eo (cm)" name="waist_cm" />
            <Field label="Vòng mông (cm)" name="hip_cm" />
            <Field label="Vòng đùi (cm)" name="thigh_cm" />
            <Field label="Vòng tay (cm)" name="arm_cm" />
            <label className="block space-y-1 text-sm">
              <span>Nhận xét</span>
              <textarea name="note" className={input} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Ảnh (tuỳ chọn)</span>
              <input name="photo" type="file" accept="image/*" />
            </label>
            <button className="min-h-12 rounded bg-teal-700 px-4 text-white">Cập nhật tình trạng</button>
          </form>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>Ngày</th><th>Cân</th><th>Eo</th><th>Mông</th>
              </tr>
            </thead>
            <tbody>
              {(meas ?? []).map((m) => (
                <tr key={m.id} data-testid="measurement-row">
                  <td>{m.measured_on}</td>
                  <td>{m.weight_kg ?? '—'}</td>
                  <td>{m.waist_cm ?? '—'}</td>
                  <td>{m.hip_cm ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="space-y-2">
            {(notes ?? []).map((n) => (
              <li key={n.id} className="rounded border p-2 text-sm">
                <span className="text-slate-500">{n.noted_on}</span> — {n.content}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'nutrition' && (
        <section className="space-y-4">
          <div>
            <h2 className="font-medium">Đang áp dụng</h2>
            <p data-testid="current-meal" className="whitespace-pre-wrap">
              {meals?.[0]?.content ?? 'Chưa có thực đơn'}
            </p>
          </div>
          <form action={addMealPlan.bind(null, id)} className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>Thực đơn mới</span>
              <textarea name="content" rows={4} className={input} />
            </label>
            <Field label="Calo mục tiêu" name="calories" />
            <button className="min-h-12 rounded bg-teal-700 px-4 text-white">Lưu thực đơn</button>
          </form>
          <div>
            <h2 className="font-medium">Lịch sử</h2>
            <ul className="space-y-2">
              {(meals ?? []).slice(1).map((m) => (
                <li key={m.id} className="rounded border p-2 text-sm">
                  <span className="text-slate-500">{m.effective_from}</span>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {tab === 'workouts' && (
        <section className="space-y-2">
          <h2 className="font-medium">Bài tập đã ghi</h2>
          <ul className="space-y-2">
            {(sessions ?? [])
              .filter((x) => x.workout_content)
              .map((x) => (
                <li key={x.id} className="rounded border p-2 text-sm">
                  <span className="text-slate-500">{vnDateLabel(new Date(x.start_at))}</span>
                  <p className="whitespace-pre-wrap">{x.workout_content}</p>
                </li>
              ))}
          </ul>
        </section>
      )}
    </main>
  );
}
