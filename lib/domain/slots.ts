import type { SessionLite } from './types';

/**
 * Whole-hour start times on `day` where the PT is free for `durationMin` minutes.
 * `booked` are the PT's sessions; cancelled ones do not block. Past slots are dropped.
 */
export function freeSlots(input: {
  day: { start: Date; end: Date };
  booked: SessionLite[];
  now: Date;
  durationMin?: number;
  fromHour?: number;
  toHour?: number;
}): Date[] {
  const { day, booked, now } = input;
  const durationMs = (input.durationMin ?? 60) * 60_000;
  const fromHour = input.fromHour ?? 6;
  const toHour = input.toHour ?? 21;
  const live = booked.filter((s) => s.status !== 'cancelled');

  const out: Date[] = [];
  for (let h = fromHour; h < toHour; h += 1) {
    const start = new Date(day.start.getTime() + h * 3600_000);
    const end = new Date(start.getTime() + durationMs);
    if (end > day.end || start <= now) continue;
    if (live.some((s) => start < s.endAt && s.startAt < end)) continue;
    out.push(start);
  }
  return out;
}
