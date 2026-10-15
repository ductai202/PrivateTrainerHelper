'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RescheduleRequestForm({
  token,
  sessionId,
  options,
}: {
  token: string;
  sessionId: string;
  options: { iso: string; label: string }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(options[0]?.iso ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (options.length === 0) {
    return <p className="text-sm text-slate-600">Hiện chưa có giờ trống để đổi, hãy nhắn PT nhé.</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/student/reschedule', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, sessionId, start: value }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Không gửi được yêu cầu, hãy thử lại');
        router.refresh();
      }
    } catch {
      setError('Mất kết nối, hãy thử lại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="block space-y-1 text-sm">
        <span>Giờ mới</span>
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-12 w-full rounded border px-3"
        >
          {options.map((o) => (
            <option key={o.iso} value={o.iso}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button disabled={busy} className="min-h-12 rounded border px-4">
        Gửi yêu cầu đổi giờ
      </button>
    </form>
  );
}
