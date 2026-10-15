'use client';
import { startTransition, useActionState } from 'react';
import { rescheduleSession } from '../lateChanges';

const input = 'min-h-12 w-full rounded border px-3';

export default function RescheduleForm({
  sessionId,
  defaultDate,
  defaultTime,
}: {
  sessionId: string;
  defaultDate: string;
  defaultTime: string;
}) {
  const [state, action, pending] = useActionState(rescheduleSession.bind(null, sessionId), undefined);
  return (
    <form
      className="space-y-2 rounded border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <h2 className="font-medium">Đổi giờ</h2>
      <label className="block space-y-1 text-sm">
        <span>Ngày mới</span>
        <input name="date" type="date" defaultValue={defaultDate} className={input} />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Giờ mới</span>
        <input name="time" type="time" defaultValue={defaultTime} className={input} />
      </label>
      {state?.error && (
        <p role="alert" className="text-red-600">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="min-h-12 rounded bg-teal-700 px-4 text-white">
        Đổi giờ
      </button>
    </form>
  );
}
