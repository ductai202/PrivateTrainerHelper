import BottomNav from '@/components/BottomNav';
import { getCurrentMember } from '@/lib/auth/currentMember';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  return (
    <div className="mx-auto min-h-screen max-w-3xl pb-20">
      {children}
      <BottomNav showOwner={member.role === 'owner'} />
    </div>
  );
}
