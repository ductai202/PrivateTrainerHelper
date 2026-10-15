'use client';
import { useActionState } from 'react';
import { createPt } from './actions';

const input = 'min-h-12 w-full rounded border px-3';

export default function InvitePt() {
  const [state, action, pending] = useActionState(createPt, undefined);
  return (
    <form action={action} className="space-y-2 border-t pt-4">
      <h2 className="font-medium">Tạo tài khoản PT</h2>
      <input name="display_name" placeholder="Tên PT" className={input} />
      <input name="email" type="email" placeholder="Email PT" className={input} />
      <select name="gender" aria-label="Giới tính PT" defaultValue="" className={input}>
        <option value="">Giới tính (chưa chọn)</option>
        <option value="male">Nam</option>
        <option value="female">Nữ</option>
        <option value="other">Khác</option>
      </select>
      <input name="birth_year" inputMode="numeric" placeholder="Năm sinh PT" className={input} />
      {state?.error && (
        <p role="alert" className="text-red-600">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <div className="space-y-1 rounded border border-green-300 bg-green-50 p-3">
          <p className="text-green-800">{state.ok}</p>
          <p className="text-sm">
            Mật khẩu tạm (chỉ hiện một lần, hãy gửi cho PT và nhờ đổi ngay trong Cài đặt):
          </p>
          <p data-testid="temp-password" className="font-mono text-lg select-all">
            {state.tempPassword}
          </p>
        </div>
      )}
      <button disabled={pending} className="min-h-12 rounded border px-4">
        Tạo tài khoản PT
      </button>
    </form>
  );
}
