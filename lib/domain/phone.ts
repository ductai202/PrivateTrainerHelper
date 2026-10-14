export function normalizeVnPhone(raw: string): string | null {
  const digits = raw.replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(digits)) return null;
  const d = digits.replace(/^\+/, '');
  if (/^84\d{9}$/.test(d)) return '0' + d.slice(2);
  if (/^0\d{9}$/.test(d)) return d;
  return null;
}

export function zaloLink(rawPhone: string): string | null {
  const p = normalizeVnPhone(rawPhone);
  return p ? `https://zalo.me/${p}` : null;
}
