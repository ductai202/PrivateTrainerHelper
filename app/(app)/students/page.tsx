import Link from 'next/link';
import { listStudents } from '@/lib/data/students';

export default async function StudentsPage() {
  const students = await listStudents();
  return (
    <main className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Học viên</h1>
        <Link href="/students/new" className="min-h-11 rounded bg-teal-700 px-4 py-2 text-white">
          + Thêm
        </Link>
      </div>
      <ul className="space-y-2">
        {students.map((s) => (
          <li key={s.id}>
            <Link href={`/students/${s.id}`} className="block rounded border p-3">
              <span className="font-medium">{s.fullName}</span>
              <span className="ml-2 text-sm text-slate-600">
                {s.remaining === null ? 'Chưa có gói' : `Còn ${s.remaining} buổi`}
              </span>
              {s.expiringSoon && (
                <span className="ml-2 rounded bg-amber-100 px-2 text-xs text-amber-800">
                  Sắp hết gói
                </span>
              )}
            </Link>
          </li>
        ))}
        {students.length === 0 && <li className="text-slate-600">Chưa có học viên.</li>}
      </ul>
    </main>
  );
}
