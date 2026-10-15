'use client';
import Link from 'next/link';
import { useState } from 'react';
import ZaloButton from '@/components/ZaloButton';
import { logMessage } from '../sessions/actions';

export default function ReminderRow(p: {
  sessionId: string;
  studentId: string;
  studentName: string;
  phone: string;
  message: string;
  reminded: boolean;
  confirmed?: boolean;
  workoutHref?: string;
}) {
  const [done, setDone] = useState(p.reminded);
  return (
    <li className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" data-testid="reminder-row">
      <div className="flex items-center justify-between">
        <span className="font-medium">{p.studentName}</span>
        {p.confirmed && (
          <span className="rounded bg-blue-200 px-2 text-xs text-blue-900">Đã xác nhận</span>
        )}
      </div>
      <p className="text-sm text-slate-600">{p.message}</p>
      {done ? (
        <span className="text-sm text-green-700">Đã nhắc</span>
      ) : (
        <ZaloButton
          phone={p.phone}
          message={p.message}
          label="Nhắc qua Zalo"
          onOpen={() => {
            setDone(true);
            void logMessage({
              sessionId: p.sessionId,
              studentId: p.studentId,
              kind: 'reminder',
              content: p.message,
            });
          }}
        />
      )}
      {p.workoutHref && (
        <Link href={p.workoutHref} className="inline-block min-h-11 text-sm underline">
          Soạn bài tập (gợi ý AI)
        </Link>
      )}
    </li>
  );
}
