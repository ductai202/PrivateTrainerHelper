'use client';
import { useState, useTransition } from 'react';
import { generateWorkoutDraft } from '../ai';
import { saveWorkout } from '../actions';

export default function WorkoutSuggest({ sessionId }: { sessionId: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const r = await generateWorkoutDraft(sessionId);
      if (r.error !== undefined) setError(r.error);
      else setDraft(r.text);
    });
  }

  function save() {
    if (draft === null) return;
    startTransition(async () => {
      await saveWorkout(sessionId, draft);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-2 rounded border border-dashed p-3">
      <button type="button" onClick={generate} disabled={pending} className="min-h-12 rounded border px-4">
        {pending && draft === null ? 'Đang soạn…' : 'Gợi ý bài tập'}
      </button>
      <p className="text-xs text-slate-600">
        Bản nháp do AI soạn từ mục tiêu, chấn thương và số đo của học viên. PT luôn xem lại và chỉnh sửa trước khi lưu.
      </p>
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      {draft !== null && (
        <div className="space-y-2">
          <label className="block space-y-1 text-sm">
            <span>Bản nháp bài tập</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={12}
              className="w-full rounded border px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="min-h-12 rounded bg-teal-700 px-4 text-white"
          >
            Lưu bản nháp
          </button>
          {saved && <p className="text-sm text-green-700">Đã lưu vào bài tập của buổi</p>}
        </div>
      )}
    </div>
  );
}
