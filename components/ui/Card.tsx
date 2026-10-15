import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  tone = 'default',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'warning' | 'success' | 'info';
}) {
  const tones = {
    default: 'border-slate-200 bg-white',
    warning: 'border-amber-300 bg-amber-50',
    success: 'border-green-300 bg-green-50',
    info: 'border-sky-300 bg-sky-50',
  };
  return <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]} ${className}`}>{children}</div>;
}

export function SectionTitle({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
      {children}
      {count !== undefined && (
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
          {count}
        </span>
      )}
    </h2>
  );
}
