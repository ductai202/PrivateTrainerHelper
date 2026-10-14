'use client';
import { useActionState } from 'react';
import { invitePt } from './actions';

const input = 'min-h-12 w-full rounded border px-3';

export default function InvitePt() {
  const [state, action, pending] = useActionState(invitePt, undefined);
  return (
    <form action={action} className="space-y-2 border-t pt-4">
      <h2 className="font-medium">Mời PT mới</h2>
      <input name="display_name" placeholder="Tên PT" className={input} />
      <input name="email" type="email" placeholder="Email PT" className={input} />
      {state?.error && <p role="alert" className="text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-green-700">{state.ok}</p>}
      <button disabled={pending} className="min-h-12 rounded border px-4">
        Gửi lời mời
      </button>
    </form>
  );
}
