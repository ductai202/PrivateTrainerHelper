// Calls the real AI provider with a sample student and prints the draft plan.
//   npx tsx scripts/ai-smoke.mts                 -> uses OPENROUTER_API_KEY / AI_MODEL from .env.local
//   AI_MODEL=google/gemma-4-31b-it:free npx tsx scripts/ai-smoke.mts
import { readFileSync } from 'node:fs';
import { formatWorkoutPlan, suggestWorkout } from '../lib/ai/suggestWorkout.ts';

const env: Record<string, string | undefined> = { ...process.env };
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && env[m[1]] === undefined) env[m[1]] = m[2];
  }
} catch {
  // no .env.local
}

const started = Date.now();
const r = await suggestWorkout(
  {
    fullName: 'Nguyễn Thị Lan',
    gender: 'female',
    age: 29,
    heightCm: 160,
    goal: 'Giảm mỡ bụng, săn chắc đùi và mông',
    healthNotes: 'Đau gối trái nhẹ khi gập sâu',
    measurements: [
      { date: '2026-10-10', weightKg: 56, waistCm: 70 },
      { date: '2026-09-26', weightKg: 58, waistCm: 72 },
    ],
    recentWorkouts: ['Squat 3x12, plank 3x40s, kéo cáp 3x12', 'Hip thrust 4x12, bước chân lunge 3x10'],
  },
  { env },
);
console.log(`model: ${env.AI_MODEL}  (${((Date.now() - started) / 1000).toFixed(1)}s)`);
if (r.ok) console.log(formatWorkoutPlan(r.plan));
else console.log('FAILED:', r.error);
process.exit(r.ok ? 0 : 1);
