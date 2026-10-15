import { loadPortal, resolveStudent } from '@/lib/student/portal';
import { vnDateLabel, vnHHmm } from '@/lib/time';
import AvailabilityForm from './AvailabilityForm';
import RescheduleRequestForm from './RescheduleRequestForm';
import { joinWaitlist, leaveWaitlist } from './actions';

export const dynamic = 'force-dynamic';

export default async function StudentPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const student = await resolveStudent(token);
  if (!student) {
    return <main className="p-4">Liên kết không hợp lệ hoặc đã hết hạn.</main>;
  }
  const view = await loadPortal(student);

  const first = view.availability[0];
  const label = (d: Date) => `${vnDateLabel(d)} · ${vnHHmm(d)}`;

  return (
    <main className="mx-auto max-w-md space-y-6 p-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Lịch tập của {student.full_name}</h1>
        <p data-testid="remaining">
          {view.remaining === null ? 'Chưa có gói tập' : `Còn ${view.remaining} buổi`}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-medium">Buổi sắp tới</h2>
        {view.upcoming.length === 0 && <p className="text-sm text-slate-600">Chưa có buổi nào sắp tới.</p>}
        {view.upcoming.map((s) => (
          <div key={s.id} data-testid="upcoming-session" className="space-y-2 rounded border p-3">
            <div className="font-medium">
              {label(s.startAt)}–{vnHHmm(s.endAt)}
            </div>
            <div className="text-sm text-slate-600">
              {s.status === 'confirmed' ? 'Đã xác nhận' : 'Chờ xác nhận'}
            </div>

            {s.request?.status === 'pending' && (
              <p data-testid="request-status" className="text-sm text-amber-800">
                Đã gửi yêu cầu đổi sang {label(s.request.requestedStart)}, đang chờ PT.
              </p>
            )}
            {s.request?.status === 'declined' && (
              <p data-testid="request-status" className="text-sm text-slate-700">
                PT chưa đổi được sang {label(s.request.requestedStart)}. Bạn có thể chọn giờ khác.
              </p>
            )}
            <RescheduleRequestForm
              token={token}
              sessionId={s.id}
              options={s.slots.map((d) => ({ iso: d.toISOString(), label: label(d) }))}
            />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Giờ rảnh của bạn</h2>
        <p className="text-sm text-slate-600">PT dựa vào đây để xếp lịch và mời bạn khi có chỗ trống.</p>
        <AvailabilityForm
          token={token}
          initialDays={view.availability.map((w) => w.weekday)}
          initialFrom={first?.from ?? '17:00'}
          initialTo={first?.to ?? '20:00'}
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Muốn tập thêm</h2>
        {view.onWaitlist ? (
          <>
            <p className="text-sm text-green-700">Bạn đang trong danh sách chờ</p>
            <form action={leaveWaitlist.bind(null, token)}>
              <button className="min-h-12 rounded border px-4">Rút khỏi danh sách chờ</button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Khi PT có buổi trống, bạn sẽ được mời trước những người khác.
            </p>
            <form action={joinWaitlist.bind(null, token)}>
              <button className="min-h-12 rounded border px-4">Muốn tập thêm</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
