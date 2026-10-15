'use client';
import { useActionState } from 'react';
import { changePassword } from './actions';

const input = 'min-h-12 w-full rounded border px-3';

export default function ChangePassword() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-2">
      <label className="block space-y-1 text-sm">
        <span>Mật khẩu mới</span>
        <input name="password" type="password" autoComplete="new-password" className={input} />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Nhập lại mật khẩu</span>
        <input name="confirm" type="password" autoComplete="new-password" className={input} />
      </label>
      {state?.error && (
        <p role="alert" className="text-red-600">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-green-700">{state.ok}</p>}
      <button disabled={pending} className="min-h-12 rounded border px-4">
        Đổi mật khẩu
      </button>
    </form>
  );
}
