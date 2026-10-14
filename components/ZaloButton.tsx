'use client';
import { zaloLink } from '@/lib/domain/phone';

/** With `message`: copies it to the clipboard, then opens the Zalo chat. */
export default function ZaloButton({
  phone,
  message,
  label = 'Mở Zalo',
  onOpen,
}: {
  phone: string;
  message?: string;
  label?: string;
  onOpen?: () => void;
}) {
  const href = zaloLink(phone);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center rounded bg-blue-600 px-4 text-sm font-medium text-white"
      onClick={() => {
        if (message) navigator.clipboard?.writeText(message).catch(() => {});
        onOpen?.();
      }}
    >
      {label}
    </a>
  );
}
