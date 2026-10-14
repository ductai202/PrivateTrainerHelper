import Link from 'next/link';

const TABS = [
  { href: '/today', label: 'Hôm nay' },
  { href: '/week', label: 'Tuần' },
  { href: '/students', label: 'Học viên' },
  { href: '/settings', label: 'Cài đặt' },
];

export default function BottomNav({ showOwner = false }: { showOwner?: boolean }) {
  const tabs = showOwner ? [...TABS.slice(0, 3), { href: '/owner', label: 'Quản lý' }, TABS[3]] : TABS;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-white">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="flex min-h-14 flex-1 items-center justify-center text-sm font-medium"
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
