'use client';
import { startTransition, useActionState } from 'react';
import { createSession } from '../actions';

const input = 'min-h-12 w-full rounded border px-3';

export default function SessionForm({
  students,
  defaults,
}: {
  students: { id: string; name: string }[];
  defaults: { student: string; date: string; time: string };
}) {
  const [state, action, pending] = useActionState(createSession, undefined);
  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <h1 className="text-xl font-semibold">Tạo buổi tập</h1>
      <label className="block space-y-1 text-sm">
        <span>Học viên</span>
        <select name="student_id" defaultValue={defaults.student} className={input}>
          <option value="">—</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span>Ngày</span>
        <input name="date" type="date" defaultValue={defaults.date} className={input} />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Giờ bắt đầu</span>
        <input name="time" type="time" defaultValue={defaults.time} className={input} />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Thời lượng (phút)</span>
        <input name="minutes" inputMode="numeric" defaultValue="60" className={input} />
      </label>
      {state?.error && (
        <p role="alert" className="text-red-600">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="min-h-12 w-full rounded bg-teal-700 font-medium text-white">
        Tạo buổi
      </button>
    </form>
  );
}
