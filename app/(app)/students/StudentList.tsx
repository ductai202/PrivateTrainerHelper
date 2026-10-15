'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { MessageCircle, Search } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

export interface StudentItem {
  id: string;
  fullName: string;
  remaining: number | null;
  expiringSoon: boolean;
  botConnected: boolean;
  ptName: string;
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();

export default function StudentList({ students, showPt }: { students: StudentItem[]; showPt: boolean }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const needle = fold(q.trim());
    return needle ? students.filter((s) => fold(s.fullName).includes(needle)) : students;
  }, [q, students]);

  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Tìm học viên</span>
        <Search size={18} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm học viên theo tên"
          aria-label="Tìm học viên"
          className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-3"
        />
      </label>

      <ul className="space-y-2">
        {shown.map((s) => (
          <li key={s.id}>
            <Link
              href={`/students/${s.id}`}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <Avatar name={s.fullName} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-900">{s.fullName}</div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-600">
                    {s.remaining === null ? 'Chưa có gói' : `Còn ${s.remaining} buổi`}
                  </span>
                  {s.expiringSoon && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                      Sắp hết gói
                    </span>
                  )}
                  {s.botConnected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-800">
                      <MessageCircle size={11} aria-hidden /> Zalo
                    </span>
                  )}
                  {showPt && <span className="text-slate-500">· {s.ptName}</span>}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {shown.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600">
          {students.length === 0 ? 'Chưa có học viên.' : 'Không tìm thấy học viên phù hợp.'}
        </div>
      )}
    </div>
  );
}
