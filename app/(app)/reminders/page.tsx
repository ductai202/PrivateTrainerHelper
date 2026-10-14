import { getCurrentMember } from '@/lib/auth/currentMember';
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
            })}
            reminded={reminded.has(s.id)}
          />
        ))}
        {sessions.length === 0 && <li className="text-slate-600">Ngày mai chưa có buổi nào.</li>}
      </ul>
    </main>
  );
}
