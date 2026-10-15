'use client';
import { useActionState } from 'react';
import { saveAvailability } from './actions';

const DAYS: [number, string][] = [
  [1, 'Thứ 2'],
  [2, 'Thứ 3'],
  [3, 'Thứ 4'],
  [4, 'Thứ 5'],
  [5, 'Thứ 6'],
  [6, 'Thứ 7'],
  [0, 'Chủ nhật'],
];
const input = 'min-h-12 w-full rounded border px-3';

export default function AvailabilityForm({
  token,
  initialDays,
  initialFrom,
  initialTo,
}: {
  token: string;
  initialDays: number[];
  initialFrom: string;
  initialTo: string;
}) {
  const [state, action, pending] = useActionState(saveAvailability.bind(null, token), undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {DAYS.map(([value, label]) => (
          <label key={value} className="flex min-h-11 items-center gap-1 text-sm">
            <input
              type="checkbox"
              name="avail_days"
              value={value}
              defaultChecked={initialDays.includes(value)}
            />
            {label}
          </label>
        ))}
      </div>
      <label className="block space-y-1 text-sm">
        <span>Rảnh từ</span>
        <input name="avail_from" type="time" defaultValue={initialFrom} className={input} />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Rảnh đến</span>
        <input name="avail_to" type="time" defaultValue={initialTo} className={input} />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      <button disabled={pending} className="min-h-12 rounded border px-4">
        Lưu giờ rảnh
      </button>
    </form>
  );
}
