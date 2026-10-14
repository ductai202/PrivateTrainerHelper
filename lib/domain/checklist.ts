import type { ChecklistItem, SessionLite } from './types';

export function pendingChecklist(s: SessionLite, _now: Date): ChecklistItem[] {
  if (s.status === 'cancelled' || s.status === 'no_show') return [];
  if (s.status === 'scheduled' || s.status === 'confirmed') return ['outcome', 'sign', 'workout'];
  const items: ChecklistItem[] = [];
  if (!s.studentSigned) items.push('sign');
  if (!s.workoutLogged) items.push('workout');
  return items;
}

export function needsChecklistPush(s: SessionLite, now: Date): boolean {
  return s.endAt <= now && pendingChecklist(s, now).length > 0;
}
