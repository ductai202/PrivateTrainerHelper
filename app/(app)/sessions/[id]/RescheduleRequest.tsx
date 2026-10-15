'use client';
import { useActionState } from 'react';
import { approveReschedule, declineReschedule } from '../lateChanges';

export default function RescheduleRequest({
  requestId,
  label,
}: {
  requestId: string;
  label: string;
}) {
  const [state, approve, pending] = useActionState(approveReschedule.bind(null, requestId), undefined);
  return (
    <div data-testid="reschedule-request" className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3">
      <p className="font-medium">Học viên xin đổi sang {label}</p>
      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <form action={approve}>
          <button disabled={pending} className="min-h-12 rounded bg-teal-700 px-4 text-white">
            Đồng ý đổi giờ
          </button>
        </form>
        <form action={declineReschedule.bind(null, requestId)}>
          <button className="min-h-12 rounded border bg-white px-4">Từ chối</button>
        </form>
      </div>
    </div>
  );
}
