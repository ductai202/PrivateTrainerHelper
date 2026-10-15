'use client';
import { startTransition, useActionState } from 'react';
import { createStudent } from '../actions';

const DAYS: [string, string][] = [
  ['1', 'Thứ 2'],
  ['2', 'Thứ 3'],
  ['3', 'Thứ 4'],
  ['4', 'Thứ 5'],
  ['5', 'Thứ 6'],
  ['6', 'Thứ 7'],
  ['0', 'Chủ nhật'],
];
const input = 'min-h-12 w-full rounded border px-3';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function StudentForm() {
  const [state, action, pending] = useActionState(createStudent, undefined);
  return (
    <form
      noValidate
      className="space-y-5 p-4"
      onSubmit={(e) => {
        // dispatch manually: React 19 resets uncontrolled fields after a form action
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <h1 className="text-xl font-semibold">Thêm học viên</h1>
      <section className="space-y-3">
        <h2 className="font-medium">Thông tin</h2>
        <Field label="Họ tên">
          <input name="full_name" className={input} />
        </Field>
        <Field label="Số điện thoại">
          <input name="phone" inputMode="tel" className={input} />
        </Field>
        <Field label="Năm sinh">
          <input name="birth_year" inputMode="numeric" className={input} />
        </Field>
        <Field label="Giới tính">
          <select name="gender" className={input} defaultValue="">
            <option value="">—</option>
            <option value="female">Nữ</option>
            <option value="male">Nam</option>
            <option value="other">Khác</option>
          </select>
        </Field>
        <Field label="Chiều cao (cm)">
          <input name="height_cm" inputMode="decimal" className={input} />
        </Field>
      </section>
      <section className="space-y-3">
        <h2 className="font-medium">Số đo</h2>
        <Field label="Cân nặng (kg)">
          <input name="weight_kg" inputMode="decimal" className={input} />
        </Field>
        <Field label="Vòng ngực (cm)">
          <input name="chest_cm" inputMode="decimal" className={input} />
        </Field>
        <Field label="Vòng eo (cm)">
          <input name="waist_cm" inputMode="decimal" className={input} />
        </Field>
        <Field label="Vòng mông (cm)">
          <input name="hip_cm" inputMode="decimal" className={input} />
        </Field>
        <Field label="Vòng đùi (cm)">
          <input name="thigh_cm" inputMode="decimal" className={input} />
        </Field>
        <Field label="Vòng tay (cm)">
          <input name="arm_cm" inputMode="decimal" className={input} />
        </Field>
      </section>
      <section className="space-y-3">
        <h2 className="font-medium">Mục tiêu và sức khoẻ</h2>
        <Field label="Mục tiêu">
          <input name="goal" className={input} />
        </Field>
        <Field label="Chấn thương / ghi chú">
          <textarea name="health_notes" className={input} />
        </Field>
      </section>
      <section className="space-y-3">
        <h2 className="font-medium">Meal prep</h2>
        <Field label="Meal prep hiện tại">
          <textarea name="meal_content" rows={4} className={input} />
        </Field>
      </section>
      <section className="space-y-3">
        <h2 className="font-medium">Gói tập</h2>
        <Field label="Số buổi trong gói">
          <input name="total_sessions" inputMode="numeric" className={input} />
        </Field>
        <Field label="Số buổi mong muốn mỗi tuần">
          <input name="target_per_week" inputMode="numeric" defaultValue="2" className={input} />
        </Field>
      </section>
      <section className="space-y-3">
        <h2 className="font-medium">Giờ rảnh</h2>
        <div className="flex flex-wrap gap-3">
          {DAYS.map(([v, l]) => (
            <label key={v} className="flex min-h-11 items-center gap-1 text-sm">
              <input type="checkbox" name="avail_days" value={v} />
              {l}
            </label>
          ))}
        </div>
        <Field label="Rảnh từ">
          <input name="avail_from" type="time" className={input} />
        </Field>
        <Field label="Rảnh đến">
          <input name="avail_to" type="time" className={input} />
        </Field>
      </section>
      {state?.error && (
        <p role="alert" className="text-red-600">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="min-h-12 w-full rounded bg-teal-700 font-medium text-white"
      >
        Lưu học viên
      </button>
    </form>
  );
}
