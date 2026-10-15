'use client';
import { useActionState } from 'react';
import { login } from './actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="space-y-2 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700 text-xl font-bold text-white">
          PT
        </span>
        <h1 className="text-2xl font-semibold text-slate-900">PT Helper</h1>
        <p className="text-sm text-slate-600">Quản lý lịch tập và học viên cho huấn luyện viên</p>
      </div>
      <form
        action={action}
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 className="text-lg font-semibold">Đăng nhập</h2>
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          autoComplete="username"
          className="min-h-12 rounded-xl border border-slate-300 px-3"
        />
        <input
          name="password"
          type="password"
          placeholder="Mật khẩu"
          required
          autoComplete="current-password"
          className="min-h-12 rounded-xl border border-slate-300 px-3"
        />
        {state?.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        <button disabled={pending} className="min-h-12 rounded-xl bg-teal-700 font-medium text-white">
          Đăng nhập
        </button>
      </form>
    </div>
  );
}
