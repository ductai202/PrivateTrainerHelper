import type { ReactNode } from 'react';

export function StatTile({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  icon?: ReactNode;
  tone?: 'default' | 'warning' | 'success';
}) {
  const tones = {
    default: 'text-slate-900',
    warning: 'text-amber-700',
    success: 'text-teal-700',
  };
  return (
    <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-1 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${tones[tone]}`}>{value}</div>
    </div>
  );
}
