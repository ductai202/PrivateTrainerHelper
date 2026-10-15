import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getCurrentMember } from '@/lib/auth/currentMember';
import { listStudents } from '@/lib/data/students';
import StudentList from './StudentList';

export default async function StudentsPage() {
  const member = await getCurrentMember();
  const students = await listStudents();
  return (
    <main className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Học viên</h1>
          <p className="text-sm text-slate-600">{students.length} học viên đang theo dõi</p>
        </div>
        <Link
          href="/students/new"
          className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-teal-700 px-4 font-medium text-white"
        >
          <Plus size={18} aria-hidden /> Thêm
        </Link>
      </div>
      <StudentList
        showPt={member.role === 'owner'}
        students={students.map((s) => ({
          id: s.id,
          fullName: s.fullName,
          remaining: s.remaining,
          expiringSoon: s.expiringSoon,
          botConnected: s.botConnected,
          ptName: s.ptName,
        }))}
      />
    </main>
  );
}
