/** True when `attempts` already holds `max` tries inside the last `windowMin` minutes. */
export function isRateLimited(attempts: Date[], now: Date, max = 5, windowMin = 10): boolean {
  const since = now.getTime() - windowMin * 60_000;
  return attempts.filter((a) => a.getTime() > since).length >= max;
}
