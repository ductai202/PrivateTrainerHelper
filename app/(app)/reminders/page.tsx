import Link from 'next/link';
import { headers } from 'next/headers';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { linkSecret, signSessionToken } from '@/lib/links/token';
import { aiConfigured } from '@/lib/ai/suggestWorkout';
import { getEveningPrep } from '@/lib/data/prep';
import { reminderMessage } from '@/lib/domain/messages';
import { vnDateLabel, vnHHmm } from '@/lib/time';
import ReminderRow from './ReminderRow';
import { bookSuggestion } from './actions';

export default async function RemindersPage() {
  const member = await getCurrentMember();
  const prep = await getEveningPrep(member);

  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  const secret = linkSecret();

  return (
    <main className="space-y-6 p-4">
      <h1 className="text-xl font-semibold">Chuẩn bị ngày mai · {vnDateLabel(prep.tomorrow.start)}</h1>

      <section className="space-y-2">
        <h2 className="font-medium">Hôm nay chưa cập nhật</h2>
        {prep.unfinishedToday.length === 0 ? (
          <p className="text-sm text-slate-600">Mọi buổi hôm nay đã cập nhật xong.</p>
        ) : (
          <ul className="space-y-2">
            {prep.unfinishedToday.map((s) => (
              <li key={s.id} data-testid="unfinished-row">
                <Link href={`/sessions/${s.id}`} className="block rounded border border-amber-300 bg-amber-50 p-3">
                  <span className="font-medium">{vnHHmm(s.startAt)}</span> · {s.studentName}
                  <span className="ml-2 text-xs text-amber-900">Chưa ký / ghi bài tập</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Buổi ngày mai</h2>
        <ul className="space-y-2">
          {prep.tomorrowSessions.map((s) => (
            <ReminderRow
              key={s.id}
              sessionId={s.id}
              studentId={s.studentId}
              studentName={s.studentName}
              phone={s.studentPhone}
              confirmed={s.status === 'confirmed'}
              workoutHref={aiConfigured() ? `/sessions/${s.id}` : undefined}
              message={reminderMessage({
                studentName: s.studentName,
                ptName: s.ptName,
                startAt: s.startAt,
                link: secret ? `${origin}/c/${signSessionToken(s.id, secret)}` : undefined,
              })}
              reminded={prep.remindedSessionIds.has(s.id)}
            />
          ))}
          {prep.tomorrowSessions.length === 0 && (
            <li className="text-slate-600">Ngày mai chưa có buổi nào.</li>
          )}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Gợi ý xếp lịch</h2>
        {member.role === 'owner' ? (
          <p className="text-sm text-slate-600">Gợi ý xếp lịch dành cho từng PT, hãy đăng nhập bằng tài khoản PT.</p>
        ) : prep.suggestions.length === 0 ? (
          <p className="text-sm text-slate-600">Không có gợi ý nào cho ngày mai.</p>
        ) : (
          <ul className="space-y-2">
            {prep.suggestions.map((s) => (
              <li key={s.studentId} data-testid="suggestion-row" className="space-y-2 rounded border p-3">
                <div className="font-medium">
                  {vnHHmm(s.startAt)}–{vnHHmm(s.endAt)} · {s.name}
                </div>
                <p className="text-sm text-slate-600">{s.reason}</p>
                <form
                  action={bookSuggestion.bind(
                    null,
                    s.studentId,
                    s.startAt.toISOString(),
                    s.endAt.toISOString(),
                  )}
                >
                  <button className="min-h-11 rounded bg-teal-700 px-4 text-sm text-white">Đặt buổi</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
