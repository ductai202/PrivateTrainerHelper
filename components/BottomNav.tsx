'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, CalendarRange, MoonStar, Settings, ShieldCheck, Users } from 'lucide-react';

const TABS = [
  { href: '/today', label: 'Hôm nay', Icon: CalendarDays },
  { href: '/week', label: 'Tuần', Icon: CalendarRange },
  { href: '/reminders', label: 'Tối nay', Icon: MoonStar },
  { href: '/students', label: 'Học viên', Icon: Users },
];
const OWNER_TAB = { href: '/owner', label: 'Quản lý', Icon: ShieldCheck };
const SETTINGS_TAB = { href: '/settings', label: 'Cài đặt', Icon: Settings };

export default function BottomNav({ showOwner = false }: { showOwner?: boolean }) {
  const pathname = usePathname();
  const tabs = [...TABS, ...(showOwner ? [OWNER_TAB] : []), SETTINGS_TAB];
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active ? 'text-teal-700' : 'text-slate-500'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
