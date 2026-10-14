'use client';
import Link from 'next/link';
import ZaloButton from '@/components/ZaloButton';
import { logMessage } from '../actions';

export default function FillInInvite({
  sessionId,
  studentId,
  name,
  phone,
  message,
  bookHref,
}: {
  sessionId: string;
  studentId: string;
  name: string;
  phone: string;
  message: string;
  bookHref: string;
}) {
  return (
    <li className="space-y-2 rounded border p-3">
      <div className="font-medium">{name}</div>
      <div className="flex flex-wrap gap-2">
        <ZaloButton
          phone={phone}
          message={message}
          label="Mời qua Zalo"
          onOpen={() => void logMessage({ sessionId, studentId, kind: 'fill_in', content: message })}
        />
        <Link href={bookHref} className="inline-flex min-h-11 items-center rounded border px-4 text-sm">
          Đặt buổi cho học viên này
        </Link>
      </div>
    </li>
  );
}
