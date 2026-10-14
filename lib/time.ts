export const TZ = 'Asia/Ho_Chi_Minh';

// Vietnam has no DST: a fixed UTC+7 offset is exact.
const OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const shift = (d: Date) => new Date(d.getTime() + OFFSET_MS);
const pad = (n: number) => String(n).padStart(2, '0');

export function vnDayRange(at: Date): { start: Date; end: Date } {
  const localMidnight = Math.floor(shift(at).getTime() / DAY_MS) * DAY_MS;
  const start = new Date(localMidnight - OFFSET_MS);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

export function vnWeekday(at: Date): number {
  return shift(at).getUTCDay();
}

export function vnWeekRange(at: Date): { start: Date; end: Date } {
  const day = vnDayRange(at).start;
  const sinceMonday = (vnWeekday(at) + 6) % 7;
  const start = new Date(day.getTime() - sinceMonday * DAY_MS);
  return { start, end: new Date(start.getTime() + 7 * DAY_MS) };
}

export function vnHHmm(at: Date): string {
  const l = shift(at);
  return `${pad(l.getUTCHours())}:${pad(l.getUTCMinutes())}`;
}

const WEEKDAY_LABELS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export function vnDateLabel(at: Date): string {
  const l = shift(at);
  return `${WEEKDAY_LABELS[l.getUTCDay()]}, ${pad(l.getUTCDate())}/${pad(l.getUTCMonth() + 1)}`;
}

/** YYYY-MM-DD of the VN calendar day containing `at`. */
export function vnDateIso(at: Date): string {
  return shift(at).toISOString().slice(0, 10);
}
