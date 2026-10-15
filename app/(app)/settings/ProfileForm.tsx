'use client';
import { useActionState } from 'react';
import { saveProfile } from './actions';

const input = 'min-h-12 w-full rounded border px-3';

export default function ProfileForm({
  gender,
  birthYear,
}: {
  gender: string | null;
  birthYear: number | null;
}) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  return (
    <form action={action} className="space-y-2">
      <label className="block space-y-1 text-sm">
        <span>Giới tính</span>
        <select name="gender" aria-label="Giới tính" defaultValue={gender ?? ''} className={input}>
          <option value="">Chưa chọn</option>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
          <option value="other">Khác</option>
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span>Năm sinh</span>
        <input
          name="birth_year"
          inputMode="numeric"
          defaultValue={birthYear ?? ''}
          placeholder="1995"
          className={input}
        />
      </label>
      <p className="text-xs text-slate-600">
        App dùng thông tin này để xưng hô đúng với học viên (anh/chị/em/bạn) trong lời nhắn.
      </p>
      {state?.error && (
        <p role="alert" className="text-red-600">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-green-700">{state.ok}</p>}
      <button disabled={pending} className="min-h-12 rounded border px-4">
        Lưu thông tin
      </button>
    </form>
  );
}
