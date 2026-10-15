/**
 * AI workout draft for a PT to review. Provider: OpenRouter (OpenAI-compatible chat API), so
 * any model it offers — including free ones — can be used by changing `AI_MODEL`.
 *
 * Privacy: only first name, goal, health notes, age/gender/height, last measurements and last
 * workouts are sent. Never the phone number or the full name.
 */

export interface WorkoutContext {
  fullName: string;
  gender: 'male' | 'female' | 'other' | null;
  age: number | null;
  heightCm: number | null;
  goal: string | null;
  healthNotes: string | null;
  /** Newest first. */
  measurements: { date: string; weightKg: number | null; waistCm: number | null }[];
  /** Newest first, plain text of the workout the PT wrote. */
  recentWorkouts: string[];
}

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  note?: string;
}

export interface WorkoutPlan {
  warmup: string[];
  exercises: WorkoutExercise[];
  cooldown: string[];
  safety: string[];
}

export type WorkoutResult = { ok: true; plan: WorkoutPlan } | { ok: false; error: string };

const MAX_NOTE_CHARS = 600;
const MAX_EXERCISES = 12;
const DEFAULT_MODEL = 'google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free,openrouter/free';
const DEFAULT_MAX_TOKENS = 6000;
const DEFAULT_BASE = 'https://openrouter.ai/api/v1';
const TIMEOUT_MS = 60_000;

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);
const firstName = (full: string) => full.trim().split(/\s+/).pop() ?? full;
const GENDER: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' };

export function buildWorkoutPrompt(ctx: WorkoutContext): { system: string; user: string } {
  const system = [
    'Bạn là trợ lý cho huấn luyện viên cá nhân (PT) ở phòng gym tại Việt Nam.',
    'Hãy soạn BẢN NHÁP một buổi tập 60 phút cho học viên dưới đây; PT sẽ xem lại và chỉnh sửa.',
    'Tôn trọng tuyệt đối chấn thương và ghi chú sức khoẻ. Không đưa lời khuyên y tế.',
    'Chỉ trả về MỘT đối tượng JSON, không thêm chữ nào khác, đúng cấu trúc:',
    '{"warmup":[string],"exercises":[{"name":string,"sets":number,"reps":string,"rest":string,"note":string}],"cooldown":[string],"safety":[string]}',
    'Viết bằng tiếng Việt, 5 đến 8 bài, tên bài ngắn gọn.',
  ].join('\n');

  const m = ctx.measurements
    .slice(0, 2)
    .map((x) => `${x.date}: cân ${x.weightKg ?? '?'} kg, eo ${x.waistCm ?? '?'} cm`)
    .join('; ');
  const w = ctx.recentWorkouts
    .slice(0, 3)
    .map((x, i) => `${i + 1}) ${clip(x, 300)}`)
    .join('\n');

  const user = [
    `Học viên: ${firstName(ctx.fullName)}`,
    `Giới tính: ${ctx.gender ? GENDER[ctx.gender] : 'Chưa có'}; tuổi: ${ctx.age ?? 'Chưa có'}; cao: ${ctx.heightCm ?? 'Chưa có'} cm`,
    `Mục tiêu: ${clip(ctx.goal ?? 'Chưa có', MAX_NOTE_CHARS)}`,
    `Chấn thương / lưu ý sức khoẻ: ${clip(ctx.healthNotes ?? 'Chưa có', MAX_NOTE_CHARS)}`,
    `Số đo gần đây: ${m || 'Chưa có'}`,
    `Bài tập các buổi trước:\n${w || 'Chưa có'}`,
  ].join('\n');
  return { system, user };
}

const asStringList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];

/** Pulls the first top-level JSON object out of a model answer (handles fences and chatter). */
function extractJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  if (start === -1) throw new Error('no json');
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i += 1) {
    const c = text[i];
    if (inString) {
      if (c === '\\') i += 1;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error('unterminated json');
}

export function parseWorkoutPlan(text: string): WorkoutPlan {
  const raw = extractJsonObject(text) as Record<string, unknown>;
  const exercises: WorkoutExercise[] = [];
  for (const e of Array.isArray(raw.exercises) ? raw.exercises : []) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    if (typeof o.name !== 'string' || o.name.trim() === '') continue;
    const sets = Number(o.sets);
    exercises.push({
      name: o.name.trim(),
      sets: Number.isFinite(sets) && sets > 0 ? Math.round(sets) : 3,
      reps: o.reps === undefined || o.reps === null ? '10' : String(o.reps),
      rest: o.rest === undefined || o.rest === null ? '60s' : String(o.rest),
      ...(typeof o.note === 'string' && o.note.trim() ? { note: o.note.trim() } : {}),
    });
    if (exercises.length === MAX_EXERCISES) break;
  }
  if (exercises.length === 0) throw new Error('no exercises');
  return {
    warmup: asStringList(raw.warmup),
    exercises,
    cooldown: asStringList(raw.cooldown),
    safety: asStringList(raw.safety),
  };
}

export function formatWorkoutPlan(plan: WorkoutPlan): string {
  const lines: string[] = [];
  if (plan.warmup.length) lines.push('Khởi động:', ...plan.warmup.map((x) => `- ${x}`), '');
  lines.push('Bài tập:');
  plan.exercises.forEach((e, i) => {
    lines.push(`${i + 1}. ${e.name} — ${e.sets} x ${e.reps} · nghỉ ${e.rest}`);
    if (e.note) lines.push(`   ${e.note}`);
  });
  if (plan.cooldown.length) lines.push('', 'Giãn cơ:', ...plan.cooldown.map((x) => `- ${x}`));
  if (plan.safety.length) lines.push('', 'Lưu ý an toàn:', ...plan.safety.map((x) => `- ${x}`));
  return lines.join('\n');
}

type Env = Record<string, string | undefined>;

export function aiConfigured(env: Env = process.env): boolean {
  return !!env.OPENROUTER_API_KEY;
}

/** One attempt against one model. */
type Attempt =
  | { kind: 'plan'; plan: WorkoutPlan }
  | { kind: 'busy' } // rate limited, server error or network: try the next model
  | { kind: 'unusable' } // answered, but not a plan we can use: try the next model
  | { kind: 'auth' }; // key rejected: no point trying other models

async function attempt(
  model: string,
  system: string,
  user: string,
  env: Env,
  doFetch: typeof fetch,
): Promise<Attempt> {
  const base = (env.OPENROUTER_BASE_URL ?? DEFAULT_BASE).replace(/[/]+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await doFetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'PT Helper',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        // reasoning models spend part of this on thinking before they write the answer
        max_tokens: Number(env.AI_MAX_TOKENS) > 0 ? Number(env.AI_MAX_TOKENS) : DEFAULT_MAX_TOKENS,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
  } catch {
    return { kind: 'busy' };
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403) return { kind: 'auth' };
  if (!res.ok) return { kind: 'busy' };
  try {
    const body = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return { kind: 'unusable' };
    return { kind: 'plan', plan: parseWorkoutPlan(content) };
  } catch {
    return { kind: 'unusable' };
  }
}

/**
 * `AI_MODEL` may list several models separated by commas; they are tried in order, so a
 * rate-limited free model falls through to the next one.
 */
export async function suggestWorkout(
  ctx: WorkoutContext,
  deps: { env?: Env; fetchImpl?: typeof fetch } = {},
): Promise<WorkoutResult> {
  const env = deps.env ?? process.env;
  const doFetch = deps.fetchImpl ?? fetch;
  if (!aiConfigured(env)) return { ok: false, error: 'AI chưa được cấu hình' };

  const { system, user } = buildWorkoutPrompt(ctx);
  const models = (env.AI_MODEL ?? DEFAULT_MODEL)
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  let sawBusy = false;
  for (const model of models) {
    const r = await attempt(model, system, user, env, doFetch);
    if (r.kind === 'plan') return { ok: true, plan: r.plan };
    if (r.kind === 'auth') return { ok: false, error: 'Khoá AI không hợp lệ' };
    if (r.kind === 'busy') sawBusy = true;
  }
  return {
    ok: false,
    error: sawBusy
      ? 'AI đang bận, thử lại sau ít phút'
      : 'AI trả về nội dung không dùng được, hãy thử lại',
  };
}
