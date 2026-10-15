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
  onWaitlist = false,
}: {
  sessionId: string;
  studentId: string;
  name: string;
  phone: string;
  message: string;
  bookHref: string;
  onWaitlist?: boolean;
}) {
  return (
    <li className="space-y-2 rounded border p-3">
      <div className="flex items-center gap-2">
        <span data-testid="fill-in-name" className="font-medium">
          {name}
        </span>
        {onWaitlist && (
          <span data-testid="fill-in-waitlist" className="rounded bg-teal-100 px-2 text-xs text-teal-900">
            Đang chờ slot
          </span>
        )}
      </div>
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
