'use client';
import { useActionState } from 'react';
import { login } from './actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="mx-auto flex max-w-sm flex-col gap-3 p-4">
      <h1 className="text-xl font-semibold">Đăng nhập</h1>
      <input name="email" type="email" placeholder="Email" required
        className="min-h-12 rounded border px-3" />
      <input name="password" type="password" placeholder="Mật khẩu" required
        className="min-h-12 rounded border px-3" />
      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="min-h-12 rounded bg-teal-700 font-medium text-white">
        Đăng nhập
      </button>
    </form>
  );
}
