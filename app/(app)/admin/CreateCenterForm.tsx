'use client';
import { useActionState } from 'react';
import { createCenter } from '../centers';

export default function CreateCenterForm() {
  const [state, action, pending] = useActionState(createCenter, undefined);
  return (
    <form action={action} className="space-y-2">
      <input
        name="name"
        placeholder="Tên trung tâm"
        className="min-h-12 w-full rounded-xl border border-slate-300 px-3"
      />
      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      <button disabled={pending} className="min-h-12 rounded-xl bg-teal-700 px-4 font-medium text-white">
        Tạo trung tâm
      </button>
    </form>
  );
}
