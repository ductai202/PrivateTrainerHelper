import { createServerSupabase } from '@/lib/supabase/server';
import { SESSION_SELECT, toSessionRow } from '@/lib/data/sessions';
import { getFillInCandidates } from '@/lib/data/fillIns';
import { suggestFillIns } from '@/lib/domain/fillIns';
import { fillInInviteMessage } from '@/lib/domain/messages';
import { QUICK_REASONS } from '@/lib/domain/reasons';
import { vnDateLabel, vnHHmm } from '@/lib/time';
import { cancelSession, markOutcome, saveWorkout, setSigned } from '../actions';
import { confirmSession, reopenSession, studentCancelled } from '../lateChanges';
import FillInInvite from './FillInInvite';
import RescheduleForm from './RescheduleForm';

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Chưa diễn ra',
  confirmed: 'Đã xác nhận',
  done: 'Đã hoàn thành',
  no_show: 'Vắng',
  cancelled: 'Đã huỷ',
};
const input = 'min-h-12 w-full rounded border px-3';
const btn = 'min-h-12 rounded border px-4';

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reschedule?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createServerSupabase();
  const valid = /^[0-9a-f-]{36}$/i.test(id);
  const { data } = valid
    ? await supabase.from('sessions').select(SESSION_SELECT).eq('id', id).maybeSingle()
    : { data: null };
  if (!data) return <main className="p-4">Không tìm thấy buổi tập</main>;
  const s = toSessionRow(data as unknown as Parameters<typeof toSessionRow>[0]);

  const now = new Date();
  const upcoming = (s.status === 'scheduled' || s.status === 'confirmed') && s.startAt > now;
  const candidates =
    s.status === 'cancelled'
      ? suggestFillIns(
          { startAt: s.startAt, endAt: s.endAt },
          await getFillInCandidates(s.id, { ptId: s.ptId, studentId: s.studentId, startAt: s.startAt }),
        )
      : [];
  const date = new Date(s.startAt.getTime() + 7 * 3600000).toISOString().slice(0, 10);

  return (
    <main className="space-y-4 p-4">
      <header>
        <h1 className="text-xl font-semibold">{s.studentName}</h1>
        <p>
          {vnDateLabel(s.startAt)} · {vnHHmm(s.startAt)}–{vnHHmm(s.endAt)}
        </p>
        <p data-testid="status">{STATUS_LABEL[s.status]}</p>
        {s.cancelReason && (
          <p className="text-sm text-slate-600">
            Lý do huỷ: {s.cancelReason}
            {s.cancelledBy === 'student' && ' (học viên báo)'}
            {s.cancelledBy === 'pt' && ' (PT huỷ)'}
          </p>
        )}
      </header>

      {upcoming && (
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {s.status === 'scheduled' ? (
              <form action={confirmSession.bind(null, s.id)}>
                <button className="min-h-14 w-full rounded bg-teal-700 font-medium text-white">
                  Vẫn tập
                </button>
              </form>
            ) : (
              <p className="flex min-h-14 items-center justify-center rounded border border-blue-300 bg-blue-50 text-sm">
                Đã xác nhận
              </p>
            )}
            <form action={studentCancelled.bind(null, s.id, QUICK_REASONS.busy)}>
              <button className="min-h-14 w-full rounded border font-medium text-red-700">
                Học viên báo bận
              </button>
            </form>
          </div>
          {sp.reschedule === '1' ? (
            <RescheduleForm sessionId={s.id} defaultDate={date} defaultTime={vnHHmm(s.startAt)} />
          ) : (
            <a href={`/sessions/${s.id}?reschedule=1`} className="inline-block min-h-11 text-sm underline">
              Đổi giờ buổi này
            </a>
          )}
        </section>
      )}

      {s.status !== 'cancelled' && (
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="font-medium">Kết quả buổi</h2>
            <div className="flex flex-wrap gap-2">
              <form action={markOutcome.bind(null, s.id, 'done')}>
                <button className={btn}>Hoàn thành</button>
              </form>
              <form action={markOutcome.bind(null, s.id, 'no_show')}>
                <button className={btn}>Vắng</button>
              </form>
              <form action={studentCancelled.bind(null, s.id, QUICK_REASONS.student)}>
                <button className={btn}>Học viên huỷ</button>
              </form>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-medium">Học viên đã ký</h2>
            <p data-testid="signed">{s.studentSigned ? 'Đã ký' : 'Chưa ký'}</p>
            <form action={setSigned.bind(null, s.id, !s.studentSigned)}>
              <button className={btn}>{s.studentSigned ? 'Bỏ ký' : 'Đã ký'}</button>
            </form>
          </div>

          <div className="space-y-2">
            <h2 className="font-medium">Bài tập hôm nay</h2>
            {s.workoutLogged && <p className="text-sm text-green-700">Đã ghi bài tập</p>}
            <form
              action={async (f: FormData) => {
                'use server';
                await saveWorkout(s.id, String(f.get('content') ?? ''));
              }}
              className="space-y-2"
            >
              <label className="block space-y-1 text-sm">
                <span>Nội dung bài tập</span>
                <textarea name="content" rows={4} defaultValue={s.workoutContent ?? ''} className={input} />
              </label>
              <button className={btn}>Lưu bài tập</button>
            </form>
            <form action={saveWorkout.bind(null, s.id, null)}>
              <button className="min-h-11 text-sm underline">Không cần bài tập</button>
            </form>
          </div>

          <form
            action={async (f: FormData) => {
              'use server';
              await cancelSession(s.id, String(f.get('reason') ?? ''));
            }}
            className="space-y-2 border-t pt-3"
          >
            <label className="block space-y-1 text-sm">
              <span>Lý do huỷ</span>
              <input name="reason" className={input} />
            </label>
            <button className={`${btn} text-red-700`}>Huỷ buổi</button>
          </form>
        </section>
      )}

      {s.status === 'cancelled' && (
        <section className="space-y-3">
          <form action={reopenSession.bind(null, s.id)}>
            <button className={btn}>Mở lại buổi</button>
          </form>
          <h2 className="font-medium">Gợi ý lấp slot</h2>
          {candidates.length === 0 ? (
            <p className="text-slate-600">Không có học viên phù hợp khung giờ này</p>
          ) : (
            <ul className="space-y-2">
              {candidates.map((c) => (
                <FillInInvite
                  key={c.studentId}
                  sessionId={s.id}
                  studentId={c.studentId}
                  name={c.name}
                  phone={c.phone}
                  message={fillInInviteMessage({
                    studentName: c.name,
                    ptName: s.ptName,
                    startAt: s.startAt,
                    endAt: s.endAt,
                  })}
                  bookHref={`/sessions/new?student=${c.studentId}&date=${date}&time=${vnHHmm(s.startAt)}`}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
