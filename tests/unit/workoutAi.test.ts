import { describe, it, expect, vi } from 'vitest';
import {
  buildWorkoutPrompt,
  formatWorkoutPlan,
  parseWorkoutPlan,
  suggestWorkout,
  type WorkoutContext,
} from '@/lib/ai/suggestWorkout';

const ctx: WorkoutContext = {
  fullName: 'Nguyễn Văn Lan',
  gender: 'female',
  age: 28,
  heightCm: 160,
  goal: 'Giảm mỡ, săn chắc đùi',
  healthNotes: 'Đau gối trái nhẹ',
  measurements: [
    { date: '2026-10-10', weightKg: 55, waistCm: 68 },
    { date: '2026-09-26', weightKg: 57, waistCm: 70 },
  ],
  recentWorkouts: ['Squat 4x10, plank 3x45s', 'Hip thrust 4x12'],
};

const VALID = {
  warmup: ['Chạy bộ nhẹ 5 phút'],
  exercises: [
    { name: 'Goblet squat', sets: 3, reps: '12', rest: '60s', note: 'Giữ lưng thẳng' },
    { name: 'Hip thrust', sets: 4, reps: '10', rest: '90s' },
  ],
  cooldown: ['Giãn cơ đùi trước 30s mỗi bên'],
  safety: ['Dừng nếu đau gối tăng'],
};

describe('buildWorkoutPrompt', () => {
  it('includes goal, health notes, measurements and recent workouts', () => {
    const { system, user } = buildWorkoutPrompt(ctx);
    expect(user).toContain('Giảm mỡ, săn chắc đùi');
    expect(user).toContain('Đau gối trái nhẹ');
    expect(user).toContain('55');
    expect(user).toContain('Squat 4x10');
    expect(system).toMatch(/JSON/);
  });

  it('only sends the first name, never the full name or contact details', () => {
    const { user, system } = buildWorkoutPrompt(ctx);
    expect(user).toContain('Lan');
    expect(user).not.toContain('Nguyễn Văn Lan');
    expect(user + system).not.toMatch(/0\d{9}/);
  });

  it('keeps very long notes bounded', () => {
    const { user } = buildWorkoutPrompt({ ...ctx, healthNotes: 'x'.repeat(10_000) });
    expect(user.length).toBeLessThan(4000);
  });

  it('copes with missing optional data', () => {
    const { user } = buildWorkoutPrompt({
      fullName: 'An',
      gender: null,
      age: null,
      heightCm: null,
      goal: null,
      healthNotes: null,
      measurements: [],
      recentWorkouts: [],
    });
    expect(user).toContain('An');
    expect(user).toContain('Chưa có');
  });
});

describe('parseWorkoutPlan', () => {
  it('parses plain JSON', () => {
    const plan = parseWorkoutPlan(JSON.stringify(VALID));
    expect(plan.exercises).toHaveLength(2);
    expect(plan.exercises[0]).toMatchObject({ name: 'Goblet squat', sets: 3, reps: '12', rest: '60s' });
  });

  it('parses JSON wrapped in a markdown fence or surrounded by prose', () => {
    const fenced = '```json\n' + JSON.stringify(VALID) + '\n```';
    expect(parseWorkoutPlan(fenced).exercises).toHaveLength(2);
    const chatty = 'Đây là bài tập:\n' + JSON.stringify(VALID) + '\nChúc tập tốt!';
    expect(parseWorkoutPlan(chatty).exercises).toHaveLength(2);
  });

  it('rejects text with no JSON object', () => {
    expect(() => parseWorkoutPlan('xin lỗi, tôi không thể')).toThrow();
  });

  it('rejects a plan without exercises', () => {
    expect(() => parseWorkoutPlan(JSON.stringify({ ...VALID, exercises: [] }))).toThrow();
    expect(() => parseWorkoutPlan(JSON.stringify({ warmup: [] }))).toThrow();
  });

  it('drops malformed exercises and caps the list at 12', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ name: `Bài ${i}`, sets: 3, reps: '10', rest: '60s' }));
    const plan = parseWorkoutPlan(JSON.stringify({ ...VALID, exercises: [...many, { sets: 3 }, 'oops'] }));
    expect(plan.exercises).toHaveLength(12);
  });

  it('coerces numbers and ignores non-string list items', () => {
    const plan = parseWorkoutPlan(
      JSON.stringify({
        exercises: [{ name: 'Plank', sets: '3', reps: 45, rest: 30 }],
        warmup: ['ok', 5, null],
      }),
    );
    expect(plan.exercises[0]).toMatchObject({ sets: 3, reps: '45', rest: '30' });
    expect(plan.warmup).toEqual(['ok']);
    expect(plan.cooldown).toEqual([]);
  });
});

describe('formatWorkoutPlan', () => {
  it('renders readable sections for the PT to edit', () => {
    const text = formatWorkoutPlan(parseWorkoutPlan(JSON.stringify(VALID)));
    expect(text).toContain('Khởi động');
    expect(text).toContain('1. Goblet squat — 3 x 12 · nghỉ 60s');
    expect(text).toContain('Giữ lưng thẳng');
    expect(text).toContain('Giãn cơ');
    expect(text).toContain('Lưu ý an toàn');
  });
});

describe('suggestWorkout', () => {
  const env = { OPENROUTER_API_KEY: 'k', AI_MODEL: 'test/model', OPENROUTER_BASE_URL: 'http://x/api/v1' };
  const ok = (content: string) =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

  it('fails clearly when no API key is configured', async () => {
    const r = await suggestWorkout(ctx, { env: {}, fetchImpl: vi.fn() });
    expect(r).toEqual({ ok: false, error: 'AI chưa được cấu hình' });
  });

  it('returns the parsed plan on success and sends the key and model', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok(JSON.stringify(VALID)));
    const r = await suggestWorkout(ctx, { env, fetchImpl });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.plan.exercises[0].name).toBe('Goblet squat');

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://x/api/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer k');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('test/model');
    expect(body.messages[0].role).toBe('system');
  });

  it('maps rate limiting and server errors to a friendly message', async () => {
    for (const status of [429, 500, 503]) {
      const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status }));
      const r = await suggestWorkout(ctx, { env, fetchImpl });
      expect(r).toEqual({ ok: false, error: 'AI đang bận, thử lại sau ít phút' });
    }
  });

  it('reports a bad key distinctly', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
    const r = await suggestWorkout(ctx, { env, fetchImpl });
    expect(r).toEqual({ ok: false, error: 'Khoá AI không hợp lệ' });
  });

  it('handles an unparsable answer', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok('không phải JSON'));
    const r = await suggestWorkout(ctx, { env, fetchImpl });
    expect(r).toEqual({ ok: false, error: 'AI trả về nội dung không dùng được, hãy thử lại' });
  });

  it('handles network failure and empty responses', async () => {
    const down = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    expect(await suggestWorkout(ctx, { env, fetchImpl: down })).toEqual({
      ok: false,
      error: 'AI đang bận, thử lại sau ít phút',
    });
    const empty = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 }));
    const r = await suggestWorkout(ctx, { env, fetchImpl: empty });
    expect(r.ok).toBe(false);
  });
});

describe('suggestWorkout model fallback', () => {
  const env = { OPENROUTER_API_KEY: 'k', AI_MODEL: 'a/one:free, b/two:free', OPENROUTER_BASE_URL: 'http://x/api/v1' };
  const ok = (content: string) =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

  it('tries the next model when the first is rate limited', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockResolvedValueOnce(ok(JSON.stringify(VALID)));
    const r = await suggestWorkout(ctx, { env, fetchImpl });
    expect(r.ok).toBe(true);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).model).toBe('a/one:free');
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).model).toBe('b/two:free');
  });

  it('also falls through on an empty answer (a reasoning model that ran out of tokens)', async () => {
    const empty = new Response(JSON.stringify({ choices: [{ message: { content: null } }] }), { status: 200 });
    const fetchImpl = vi.fn().mockResolvedValueOnce(empty).mockResolvedValueOnce(ok(JSON.stringify(VALID)));
    const r = await suggestWorkout(ctx, { env, fetchImpl });
    expect(r.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not keep trying when the key is rejected', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
    const r = await suggestWorkout(ctx, { env, fetchImpl });
    expect(r).toEqual({ ok: false, error: 'Khoá AI không hợp lệ' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports busy when every model fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 429 }));
    const r = await suggestWorkout(ctx, { env, fetchImpl });
    expect(r).toEqual({ ok: false, error: 'AI đang bận, thử lại sau ít phút' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('leaves room for reasoning models by default', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok(JSON.stringify(VALID)));
    await suggestWorkout(ctx, { env, fetchImpl });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).max_tokens).toBeGreaterThanOrEqual(4000);
  });
});
