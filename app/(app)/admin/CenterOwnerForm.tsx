'use client';
import { useActionState } from 'react';
import { createCenterOwner } from '../centers';

const input = 'min-h-12 w-full rounded-xl border border-slate-300 px-3';

export default function CenterOwnerForm({ gymId }: { gymId: string }) {
  const [state, action, pending] = useActionState(createCenterOwner.bind(null, gymId), undefined);
  return (
    <form action={action} className="space-y-2">
      <input name="display_name" placeholder="Tên chủ trung tâm" className={input} />
      <input name="email" type="email" placeholder="Email chủ trung tâm" className={input} />
      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <div className="space-y-1 rounded-xl border border-green-300 bg-green-50 p-3">
          <p className="text-sm text-green-800">{state.ok}</p>
          <p className="text-xs">Mật khẩu tạm (chỉ hiện một lần):</p>
          <p data-testid="center-owner-password" className="font-mono text-lg select-all">
            {state.tempPassword}
          </p>
        </div>
      )}
      <button disabled={pending} className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-medium">
        Tạo chủ trung tâm
      </button>
    </form>
  );
}
