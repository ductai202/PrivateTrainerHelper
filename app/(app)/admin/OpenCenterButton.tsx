'use client';
import { useTransition } from 'react';
import { switchCenter } from '../centers';

export default function OpenCenterButton({ gymId }: { gymId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(() => switchCenter(gymId))}
      className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium"
    >
      Mở trung tâm
    </button>
  );
}
