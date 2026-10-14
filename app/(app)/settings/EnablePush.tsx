'use client';
import { useState } from 'react';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export default function EnablePush() {
  const [status, setStatus] = useState<string>('');

  async function enable() {
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) return setStatus('Chưa cấu hình khoá thông báo trên máy chủ');
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return setStatus('Trình duyệt này chưa hỗ trợ thông báo. Hãy thêm app vào màn hình chính.');
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return setStatus('Bạn chưa cho phép thông báo');
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        }));
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      setStatus(res.ok ? 'Đã bật thông báo' : 'Không lưu được đăng ký thông báo');
    } catch {
      setStatus('Không bật được thông báo');
    }
  }

  return (
    <div className="space-y-2">
      <button onClick={enable} className="min-h-12 rounded border px-4">
        Bật thông báo
      </button>
      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}
