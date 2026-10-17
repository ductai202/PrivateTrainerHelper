import BottomNav from '@/components/BottomNav';
import CenterSwitcher from '@/components/CenterSwitcher';
import { Avatar } from '@/components/ui/Avatar';
import { getCurrentMember } from '@/lib/auth/currentMember';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();

  return (
    <div className="mx-auto min-h-screen max-w-3xl pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-sm font-bold text-white">
          PT
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div data-testid="center-name" className="truncate text-sm font-semibold text-slate-900">
            {member.gymName || 'PT Helper'}
          </div>
          <div className="truncate text-xs text-slate-500">
            {member.isPlatformAdmin ? 'Admin' : member.role === 'owner' ? 'Chủ gym' : 'Huấn luyện viên'}
          </div>
        </div>
        {member.centers.length > 1 && (
          <CenterSwitcher centers={member.centers} activeGymId={member.gymId} />
        )}
        <div className="flex items-center gap-2">
          <span className="hidden max-w-28 truncate text-sm text-slate-700 sm:inline">
            {member.displayName}
          </span>
          <Avatar name={member.displayName} size={32} />
        </div>
      </header>
      {children}
      <BottomNav showOwner={member.role === 'owner'} showAdmin={member.isPlatformAdmin} />
    </div>
  );
}
