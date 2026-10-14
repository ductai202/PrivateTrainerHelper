import { headers } from 'next/headers';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { linkSecret, signSessionToken } from '@/lib/links/token';
import { createServerSupabase } from '@/lib/supabase/server';
import { listSessions } from '@/lib/data/sessions';
import { vnDateLabel, vnDayRange } from '@/lib/time';
import { reminderMessage } from '@/lib/domain/messages';
import ReminderRow from './ReminderRow';

export default async function RemindersPage() {
  const member = await getCurrentMember();
  const tomorrow = vnDayRange(new Date(vnDayRange(new Date()).end.getTime() + 1000));
  const sessions = (
    await listSessions(tomorrow, member.role === 'owner' ? undefined : member.id)
  ).filter((s) => s.status !== 'cancelled');

  const supabase = await createServerSupabase();
  const ids = sessions.map((s) => s.id);
  const { data: log } = ids.length
    ? await supabase.from('message_log').select('session_id').eq('kind', 'reminder').in('session_id', ids)
    : { data: [] };
  const reminded = new Set((log ?? []).map((l) => l.session_id));

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  const secret = linkSecret();

  return (
    <main className="space-y-3 p-4">
      <h1 className="text-xl font-semibold">Nhắc lịch ngày mai · {vnDateLabel(tomorrow.start)}</h1>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <ReminderRow
            key={s.id}
            sessionId={s.id}
            studentId={s.studentId}
            studentName={s.studentName}
            phone={s.studentPhone}
            message={reminderMessage({
              studentName: s.studentName,
              ptName: s.ptName,
              startAt: s.startAt,
              link: secret ? `${origin}/c/${signSessionToken(s.id, secret)}` : undefined,
            })}
            reminded={reminded.has(s.id)}
          />
        ))}
        {sessions.length === 0 && <li className="text-slate-600">Ngày mai chưa có buổi nào.</li>}
      </ul>
    </main>
  );
}
