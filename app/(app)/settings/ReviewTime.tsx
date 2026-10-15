'use client';
import { useActionState } from 'react';
import { saveReviewTime } from './actions';

export default function ReviewTime({ defaultValue }: { defaultValue: string }) {
  const [state, action, pending] = useActionState(saveReviewTime, undefined);
  return (
    <form action={action} className="space-y-2">
      <label className="block space-y-1 text-sm">
        <span>Giờ nhắc buổi tối</span>
        <input
          name="time"
          type="time"
          defaultValue={defaultValue}
          className="min-h-12 w-full rounded border px-3"
        />
      </label>
      <p className="text-xs text-slate-600">
        Mỗi tối đến giờ này, app nhắc bạn nhắn học viên lịch ngày mai và gợi ý xếp lịch.
      </p>
      {state?.error && (
        <p role="alert" className="text-red-600">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-green-700">{state.ok}</p>}
      <button disabled={pending} className="min-h-12 rounded border px-4">
        Lưu giờ nhắc
      </button>
    </form>
  );
}
