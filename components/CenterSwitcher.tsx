'use client';
import { useTransition } from 'react';
import { switchCenter } from '@/app/(app)/centers';

export default function CenterSwitcher({
  centers,
  activeGymId,
}: {
  centers: { gymId: string; name: string }[];
  activeGymId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Trung tâm"
      value={activeGymId}
      disabled={pending}
      onChange={(e) => start(() => switchCenter(e.target.value))}
      className="max-w-36 truncate rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
    >
      {centers.map((c) => (
        <option key={c.gymId} value={c.gymId}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
