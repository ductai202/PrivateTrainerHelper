const COLORS = [
  'bg-teal-100 text-teal-800',
  'bg-sky-100 text-sky-800',
  'bg-violet-100 text-violet-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-emerald-100 text-emerald-800',
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Round avatar with the student's initial; the colour is stable per name. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initial = name.trim().split(/\s+/).pop()?.charAt(0).toLocaleUpperCase('vi') || '?';
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-sm font-semibold ${COLORS[hash(name) % COLORS.length]}`}
    >
      {initial}
    </span>
  );
}
