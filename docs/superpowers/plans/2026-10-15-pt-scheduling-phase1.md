# PT Scheduling — Giai đoạn 1 (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web app (PWA, mobile-first) cho PT gym private: hồ sơ học viên + tiến độ + meal prep, gói buổi, lịch ngày/tuần, checklist sau buổi có push nhắc, huỷ → gợi ý lấp slot, tin nhắn Zalo soạn sẵn (mở Zalo thủ công, không gọi API Zalo).

**Architecture:** Next.js App Router render server-side, ghi dữ liệu qua Server Actions vào Supabase Postgres; phân quyền bằng RLS theo `gym_id` + vai trò. Toàn bộ logic nghiệp vụ (đếm buổi, trùng lịch, gợi ý lấp slot, checklist, mẫu tin) là hàm thuần trong `lib/domain/` để unit test. Push notification qua Web Push (VAPID), được kích bởi Supabase `pg_cron` gọi route `/api/cron/tick` mỗi 10 phút.

**Tech Stack:** Next.js 15 (App Router, TypeScript strict), Tailwind CSS 4, Supabase (Postgres, Auth, Storage, pg_cron, pg_net), `@supabase/ssr`, `date-fns` + `date-fns-tz`, `recharts`, `web-push`, Vitest, Playwright, pgTAP (`supabase test db`).

**Spec:** `docs/superpowers/specs/2026-10-15-pt-scheduling-design.md`

## Global Constraints

- Web app, KHÔNG mobile app native. Mobile-first: thiết kế ở viewport 375px trước, nút chạm ≥ 44px, bottom nav cố định, dùng được trên laptop.
- PWA cài được: `manifest.webmanifest` (`display: "standalone"`, icon 192/512), service worker đăng ký ở root.
- Múi giờ cố định `Asia/Ho_Chi_Minh` cho mọi hiển thị và mọi phép tính "ngày/tuần"; DB lưu `timestamptz` (UTC).
- Giao diện tiếng Việt toàn bộ.
- Mọi bảng nghiệp vụ có `gym_id uuid not null`; RLS bật trên mọi bảng. PT chỉ thấy học viên/buổi của mình; `owner` thấy toàn gym.
- Chỉ buổi `status = 'done'` **và** `student_signed = true` mới trừ vào gói.
- Không gọi bất kỳ API Zalo nào trong giai đoạn này. Liên hệ học viên = link `https://zalo.me/<SĐT dạng 0xxxxxxxxx>` + nút copy tin.
- Secrets chỉ qua env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`. Có `.env.example`, không commit `.env.local`.
- Dev local cần Docker Desktop + Supabase CLI (`npx supabase start`).

## Review Focus

1. **Ranh giới ngày theo giờ VN khi server chạy UTC** — lúc 06:30 sáng VN (= 23:30 UTC hôm trước), màn Hôm nay phải hiện buổi của ngày VN hiện tại. Test: `vnDayRange` trong Task 2.
2. **SĐT nhập lộn xộn** (`0912 345 678`, `+84912345678`, `84-912-345-678`) phải ra cùng link Zalo; SĐT sai (9 số, chữ) → không hiện nút Zalo thay vì link hỏng. Test: `normalizeVnPhone` trong Task 2.
3. **Buổi liền kề** (08:00–09:00 và 09:00–10:00) không bị báo trùng; buổi đã huỷ không chặn slot. Test: `findConflicts` trong Task 3.
4. **Sửa trạng thái buổi đã ký** (done → huỷ, hoặc bỏ tick ký) phải làm số buổi còn lại tăng lại đúng. Test: `remainingSessions` trong Task 3 + e2e Task 9.
5. **PT A không xem/sửa được học viên của PT B** kể cả khi đoán được URL `/students/<id>`. Test: pgTAP trong Task 4 + e2e Task 6.

---

## File Structure

```
app/
  layout.tsx, manifest.webmanifest, globals.css
  login/page.tsx, login/actions.ts
  (app)/layout.tsx                 # bottom nav, yêu cầu đăng nhập
  (app)/today/page.tsx             # Hôm nay: timeline + badge "Chưa xong"
  (app)/week/page.tsx              # Tuần
  (app)/sessions/new/page.tsx      # tạo buổi
  (app)/sessions/[id]/page.tsx     # chi tiết buổi: checklist, huỷ, gợi ý lấp slot
  (app)/sessions/actions.ts
  (app)/reminders/page.tsx         # nhắc lịch ngày mai
  (app)/students/page.tsx, new/page.tsx, [id]/page.tsx (tabs), actions.ts
  (app)/owner/page.tsx, owner/actions.ts
  (app)/settings/page.tsx          # bật push, hướng dẫn "Thêm vào màn hình chính"
  api/push/subscribe/route.ts
  api/cron/tick/route.ts
public/sw.js, public/icons/*
lib/
  time.ts
  domain/types.ts, phone.ts, messages.ts, packages.ts, conflicts.ts, fillIns.ts, checklist.ts
  supabase/server.ts, client.ts, admin.ts, database.types.ts (generated)
  auth/currentMember.ts
  data/students.ts, sessions.ts
  push/send.ts
components/ BottomNav.tsx, SessionCard.tsx, ZaloButton.tsx, MeasurementChart.tsx, ...
supabase/migrations/0001_schema.sql, 0002_rls.sql, 0003_cron.sql
supabase/seed.sql
supabase/tests/rls.test.sql
tests/unit/*.test.ts
tests/e2e/*.spec.ts
```

---

### Task 1: Scaffold dự án + PWA shell

**Files:**
- Create: `package.json` (qua `create-next-app`), `app/layout.tsx`, `app/manifest.webmanifest`, `public/sw.js`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `components/BottomNav.tsx`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `.gitignore`
- Test: `tests/e2e/shell.spec.ts`

**Interfaces:**
- Produces: `<BottomNav />` với 4 tab `Hôm nay` (/today), `Tuần` (/week), `Học viên` (/students), `Cài đặt` (/settings). Scripts: `npm run test` (vitest), `npm run e2e` (playwright), `npm run db:types`.

- [ ] **Step 1:** `npx create-next-app@15 . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*"`; cài `vitest @vitejs/plugin-react @playwright/test date-fns date-fns-tz`.
- [ ] **Step 2: Write the failing e2e test** `tests/e2e/shell.spec.ts`

```ts
test.use({ viewport: { width: 375, height: 812 } });
test('manifest is linked and installable fields present', async ({ page, request }) => {
  await page.goto('/login');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const m = await (await request.get(href!)).json();
  expect(m.display).toBe('standalone');
  expect(m.lang).toBe('vi');
  expect(m.icons.map((i: any) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
});
test('service worker registers', async ({ page }) => {
  await page.goto('/login');
  await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()))).toBe(true);
});
```

- [ ] **Step 3:** Run `npm run e2e -- shell` → FAIL (no manifest).
- [ ] **Step 4:** Implement manifest (`name: "PT Helper"`, `short_name: "PT Helper"`, `lang: "vi"`, `start_url: "/today"`, `display: "standalone"`, `theme_color: "#0f766e"`), `public/sw.js` (rỗng trừ handler `push`/`notificationclick` sẽ thêm ở Task 10), đăng ký SW trong một client component ở `app/layout.tsx`, `<html lang="vi">`, viewport meta. Tạo placeholder `/login` page.
- [ ] **Step 5:** Run `npm run e2e -- shell` → PASS.
- [ ] **Step 6:** Commit `feat: scaffold Next.js PWA shell`.

---

### Task 2: Tiện ích thời gian, SĐT, mẫu tin nhắn

**Files:**
- Create: `lib/time.ts`, `lib/domain/phone.ts`, `lib/domain/messages.ts`
- Test: `tests/unit/time.test.ts`, `tests/unit/phone.test.ts`, `tests/unit/messages.test.ts`

**Interfaces:**
- Produces:
  - `TZ = 'Asia/Ho_Chi_Minh'`
  - `vnDayRange(at: Date): { start: Date; end: Date }` — nửa mở `[start, end)` của ngày VN chứa `at`
  - `vnWeekRange(at: Date): { start: Date; end: Date }` — tuần bắt đầu Thứ 2 theo giờ VN
  - `vnWeekday(at: Date): number` — 0 = CN … 6 = Thứ 7, theo giờ VN
  - `vnHHmm(at: Date): string` (`"08:30"`), `vnDateLabel(at: Date): string` (`"Thứ 2, 20/10"`; CN → `"Chủ nhật, 26/10"`)
  - `normalizeVnPhone(raw: string): string | null` — trả `0` + 9 chữ số
  - `zaloLink(rawPhone: string): string | null` — `https://zalo.me/<normalized>`
  - `reminderMessage(p: { studentName: string; ptName: string; startAt: Date }): string`
  - `fillInInviteMessage(p: { studentName: string; ptName: string; startAt: Date; endAt: Date }): string`

- [ ] **Step 1: Write failing tests**

```ts
// time.test.ts
it('VN day at 06:30 VN (23:30 UTC prev day)', () => {
  const r = vnDayRange(new Date('2026-10-19T23:30:00Z'));
  expect(r.start.toISOString()).toBe('2026-10-19T17:00:00.000Z');
  expect(r.end.toISOString()).toBe('2026-10-20T17:00:00.000Z');
});
it('week starts Monday VN', () => {
  expect(vnWeekRange(new Date('2026-10-22T03:00:00Z')).start.toISOString()).toBe('2026-10-18T17:00:00.000Z');
});
it('labels', () => {
  expect(vnHHmm(new Date('2026-10-20T01:30:00Z'))).toBe('08:30');
  expect(vnDateLabel(new Date('2026-10-20T01:30:00Z'))).toBe('Thứ 3, 20/10');
  expect(vnDateLabel(new Date('2026-10-26T01:30:00Z'))).toBe('Thứ 2, 26/10');
  expect(vnDateLabel(new Date('2026-10-25T01:30:00Z'))).toBe('Chủ nhật, 25/10');
  expect(vnWeekday(new Date('2026-10-25T18:00:00Z'))).toBe(1);
});
// phone.test.ts
it.each(['0912 345 678', '+84912345678', '84-912-345-678', '(091) 2345678'])('%s', raw =>
  expect(normalizeVnPhone(raw)).toBe('0912345678'));
it.each(['091234567', 'abc', '', '+1 415 555 0100'])('rejects %s', raw =>
  expect(normalizeVnPhone(raw)).toBeNull());
it('zaloLink', () => {
  expect(zaloLink('+84 912 345 678')).toBe('https://zalo.me/0912345678');
  expect(zaloLink('xyz')).toBeNull();
});
// messages.test.ts
it('reminder copy', () => {
  expect(reminderMessage({ studentName: 'Lan', ptName: 'Tài', startAt: new Date('2026-10-20T01:30:00Z') }))
    .toBe('Chào Lan, nhắc lịch tập với PT Tài lúc 08:30 Thứ 3, 20/10. Bạn xác nhận giúp mình nhé!');
});
it('fill-in copy', () => {
  expect(fillInInviteMessage({ studentName: 'Minh', ptName: 'Tài',
    startAt: new Date('2026-10-20T10:00:00Z'), endAt: new Date('2026-10-20T11:00:00Z') }))
    .toBe('Chào Minh, PT Tài vừa có slot trống 17:00–18:00 Thứ 3, 20/10. Bạn có muốn tập giờ này không?');
});
```

- [ ] **Step 2:** `npm run test` → FAIL.
- [ ] **Step 3:** Implement with `date-fns-tz` (`toZonedTime`/`fromZonedTime`). Phone: strip non-digits; `84` + 9 digits → `0` + 9; `0` + 9 digits giữ nguyên; còn lại `null`.
- [ ] **Step 4:** `npm run test` → PASS.
- [ ] **Step 5:** Commit `feat: VN time, phone and message helpers`.

---

### Task 3: Logic nghiệp vụ thuần (gói buổi, trùng lịch, lấp slot, checklist)

**Files:**
- Create: `lib/domain/types.ts`, `lib/domain/packages.ts`, `lib/domain/conflicts.ts`, `lib/domain/fillIns.ts`, `lib/domain/checklist.ts`
- Test: `tests/unit/packages.test.ts`, `conflicts.test.ts`, `fillIns.test.ts`, `checklist.test.ts`

**Interfaces:**
- Consumes: `vnDayRange`, `vnWeekRange`, `vnWeekday`, `vnHHmm` (Task 2)
- Produces:

```ts
export type SessionStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'done' | 'no_show';
export interface SessionLite {
  id: string; ptId: string; studentId: string; packageId: string | null;
  startAt: Date; endAt: Date; status: SessionStatus;
  studentSigned: boolean; workoutLogged: boolean;
}
export interface AvailabilityWindow { weekday: number; from: string; to: string } // 'HH:mm', VN
export interface FillInCandidate {
  studentId: string; name: string; phone: string; remaining: number;
  availability: AvailabilityWindow[]; sessionsOnDay: number; sessionsThisWeek: number;
}
export type ChecklistItem = 'outcome' | 'sign' | 'workout';

remainingSessions(totalSessions: number, packageId: string, sessions: SessionLite[]): number
findConflicts(c: { id?: string; ptId: string; studentId: string; startAt: Date; endAt: Date }, existing: SessionLite[]): SessionLite[]
suggestFillIns(slot: { startAt: Date; endAt: Date }, candidates: FillInCandidate[], limit?: number /*=5*/): FillInCandidate[]
pendingChecklist(s: SessionLite, now: Date): ChecklistItem[]
needsChecklistPush(s: SessionLite, now: Date): boolean   // endAt <= now và pendingChecklist không rỗng
```

- [ ] **Step 1: Write failing tests** (helper `mk(partial): SessionLite` trong test)

```ts
// packages
it('only done+signed of that package count', () => {
  const s = [mk({ status: 'done', studentSigned: true, packageId: 'p' }),
             mk({ status: 'done', studentSigned: false, packageId: 'p' }),
             mk({ status: 'no_show', packageId: 'p' }),
             mk({ status: 'cancelled', studentSigned: true, packageId: 'p' }),
             mk({ status: 'done', studentSigned: true, packageId: 'other' })];
  expect(remainingSessions(12, 'p', s)).toBe(11);
});
it('can go negative (PT allowed to overbook)', () => {
  expect(remainingSessions(0, 'p', [mk({ status: 'done', studentSigned: true, packageId: 'p' })])).toBe(-1);
});
// conflicts
it('back-to-back is not a conflict', () => {
  const e = [mk({ ptId: 'pt', startAt: at('08:00'), endAt: at('09:00') })];
  expect(findConflicts({ ptId: 'pt', studentId: 'x', startAt: at('09:00'), endAt: at('10:00') }, e)).toEqual([]);
});
it('overlap same PT or same student conflicts; cancelled and self ignored', () => {
  const a = mk({ id: 'a', ptId: 'pt', studentId: 's1', startAt: at('08:00'), endAt: at('09:00') });
  const b = mk({ id: 'b', ptId: 'pt2', studentId: 's2', startAt: at('08:30'), endAt: at('09:30') });
  const c = mk({ id: 'c', ptId: 'pt', studentId: 's3', startAt: at('08:00'), endAt: at('09:00'), status: 'cancelled' });
  const r = findConflicts({ id: 'a', ptId: 'pt', studentId: 's2', startAt: at('08:15'), endAt: at('08:45') }, [a, b, c]);
  expect(r.map(x => x.id)).toEqual(['b']);
});
// fillIns — slot Thứ 3 17:00–18:00 VN
const slot = { startAt: new Date('2026-10-20T10:00:00Z'), endAt: new Date('2026-10-20T11:00:00Z') };
it('filters and ranks', () => {
  const win = [{ weekday: 2, from: '16:00', to: '19:00' }];
  const cands = [
    cand('noLeft', { remaining: 0, availability: win }),
    cand('busyToday', { remaining: 5, availability: win, sessionsOnDay: 1 }),
    cand('notFree', { remaining: 5, availability: [{ weekday: 2, from: '17:30', to: '19:00' }] }),
    cand('twoThisWeek', { remaining: 3, availability: win, sessionsThisWeek: 2 }),
    cand('zeroThisWeekLow', { remaining: 2, availability: win }),
    cand('zeroThisWeekHigh', { remaining: 8, availability: win }),
  ];
  expect(suggestFillIns(slot, cands).map(c => c.studentId))
    .toEqual(['zeroThisWeekHigh', 'zeroThisWeekLow', 'twoThisWeek']);
});
// checklist (now = 10:00)
it('pending items', () => {
  expect(pendingChecklist(mk({ status: 'scheduled', endAt: at('09:00') }), at('10:00'))).toEqual(['outcome', 'sign', 'workout']);
  expect(pendingChecklist(mk({ status: 'done', studentSigned: true, workoutLogged: false, endAt: at('09:00') }), at('10:00'))).toEqual(['workout']);
  expect(pendingChecklist(mk({ status: 'no_show', endAt: at('09:00') }), at('10:00'))).toEqual([]);
  expect(pendingChecklist(mk({ status: 'cancelled', endAt: at('09:00') }), at('10:00'))).toEqual([]);
  expect(needsChecklistPush(mk({ status: 'scheduled', endAt: at('11:00') }), at('10:00'))).toBe(false);
});
```

- [ ] **Step 2:** `npm run test` → FAIL.
- [ ] **Step 3:** Implement. Rules:
  - Overlap = `a.start < b.end && b.start < a.end`; bỏ qua `cancelled` và cùng `id`; xung đột khi trùng `ptId` **hoặc** `studentId`.
  - `suggestFillIns`: giữ `remaining > 0 && sessionsOnDay === 0` và có window với `weekday === vnWeekday(start)`, `from <= vnHHmm(start)`, `to >= vnHHmm(end)`; sort `sessionsThisWeek` tăng dần, rồi `remaining` giảm dần; cắt `limit`.
  - `pendingChecklist`: `no_show`/`cancelled` → `[]`; `scheduled`/`confirmed` → `['outcome','sign','workout']`; `done` → các mục `sign` nếu `!studentSigned`, `workout` nếu `!workoutLogged`. Thứ tự luôn `outcome, sign, workout`.
- [ ] **Step 4:** `npm run test` → PASS.
- [ ] **Step 5:** Commit `feat: domain logic for packages, conflicts, fill-ins, checklist`.

---

### Task 4: Supabase schema, RLS, seed

**Files:**
- Create: `supabase/config.toml` (`npx supabase init`), `supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `supabase/seed.sql`, `supabase/tests/rls.test.sql`, `lib/supabase/database.types.ts` (generated)

**Interfaces:**
- Produces bảng (snake_case; mọi bảng có `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`; bảng con có `gym_id`):
  - `gyms(name)`
  - `members(gym_id, user_id → auth.users, display_name, role text check in ('owner','pt'))`, unique `(gym_id,user_id)`
  - `students(gym_id, pt_id → members, full_name, phone, birth_year int, gender text check in ('male','female','other'), height_cm numeric, goal text, health_notes text, archived bool default false)`
  - `body_measurements(gym_id, student_id, measured_on date, weight_kg, chest_cm, waist_cm, hip_cm, thigh_cm, arm_cm, body_fat_pct — numeric nullable, note)`
  - `progress_notes(gym_id, student_id, noted_on date, content text not null, photo_path text)`
  - `meal_plans(gym_id, student_id, effective_from date, calories int, protein_g int, carbs_g int, fat_g int, content text not null, note)`
  - `packages(gym_id, student_id, total_sessions int > 0, start_date date, expires_on date null)`
  - `student_availability(gym_id, student_id, weekday smallint 0–6, from_time time, to_time time, check from_time < to_time)`
  - `sessions(gym_id, pt_id, student_id, package_id null, start_at, end_at timestamptz, status text check in (...) default 'scheduled', cancel_reason, student_signed bool default false, signed_at, workout_logged bool default false, workout_content text, checklist_pushed_at, checklist_reminded_at, check end_at > start_at)`; index `(pt_id, start_at)`, `(student_id, start_at)`
  - `message_log(gym_id, session_id null, student_id, channel text check in ('manual','bot','zns'), kind text check in ('reminder','fill_in'), content, sent_at default now())`
  - `push_subscriptions(gym_id, member_id, endpoint unique, p256dh, auth)`
  - `push_log(member_id, kind text, for_date date)`, unique `(member_id, kind, for_date)`
  - Storage bucket private `progress-photos`, path `<gym_id>/<student_id>/<uuid>.jpg`
  - SQL helpers `current_member()` (security definer, trả row `members` của `auth.uid()`), `is_owner(gym uuid)`.

- [ ] **Step 1: Write failing pgTAP test** `supabase/tests/rls.test.sql` — dùng seed (owner `owner@demo.test`, PT `pt.a@demo.test`, `pt.b@demo.test`; mỗi PT 2 học viên, có sessions):
  - đăng nhập giả lập PT A (`set local role authenticated; set local request.jwt.claims ...`): `select count(*) from students` = 2; không thấy học viên của PT B; `update students set full_name='x' where pt_id = <ptB>` ảnh hưởng 0 dòng; `insert into sessions` với `pt_id = <ptB>` bị lỗi RLS.
  - PT A không đọc được `body_measurements`/`meal_plans`/`progress_notes` của học viên PT B.
  - owner: `count(*) from students` = 4, `from sessions` = toàn bộ.
  - anon: `count(*) from students` = 0.
- [ ] **Step 2:** `npx supabase start && npx supabase test db` → FAIL.
- [ ] **Step 3:** Viết migrations. Policy mẫu cho bảng gắn học viên: `using (gym_id = current_member().gym_id and (is_owner(gym_id) or student_id in (select id from students where pt_id = current_member().id)))`, cùng biểu thức cho `with check`. `students`/`sessions` dùng `pt_id = current_member().id` thay vì subquery. Seed mật khẩu chung từ `supabase/seed.sql` (ghi chú trong README, chỉ cho local).
- [ ] **Step 4:** `npx supabase db reset && npx supabase test db` → PASS. `npm run db:types` (`supabase gen types typescript --local > lib/supabase/database.types.ts`).
- [ ] **Step 5:** Commit `feat: database schema, RLS and seed`.

---

### Task 5: Đăng nhập + layout ứng dụng

**Files:**
- Create: `lib/supabase/server.ts`, `client.ts`, `admin.ts`, `lib/auth/currentMember.ts`, `middleware.ts`, `app/login/page.tsx`, `app/login/actions.ts`, `app/(app)/layout.tsx`, `app/(app)/settings/page.tsx`
- Test: `tests/e2e/auth.spec.ts`, `tests/e2e/helpers.ts`

**Interfaces:**
- Produces:
  - `createServerSupabase(): SupabaseClient<Database>` (cookie-based, `@supabase/ssr`)
  - `createAdminSupabase()` — service role, CHỈ dùng trong route cron và owner actions
  - `getCurrentMember(): Promise<{ id: string; gymId: string; role: 'owner'|'pt'; displayName: string }>` — redirect `/login` nếu chưa đăng nhập
  - e2e helper `loginAs(page, 'owner'|'ptA'|'ptB')`
- [ ] **Step 1: Failing e2e:** chưa đăng nhập vào `/today` → về `/login`; đăng nhập sai → hiện `Email hoặc mật khẩu không đúng`; đăng nhập PT A → về `/today`, bottom nav hiện 4 tab; trang `/settings` có nút `Đăng xuất` và mục `Thêm vào màn hình chính` (hướng dẫn iPhone: Chia sẻ → Thêm vào MH chính, cần iOS 16.4+ để nhận thông báo).
- [ ] **Step 2:** `npm run e2e -- auth` → FAIL.
- [ ] **Step 3:** Implement: email + mật khẩu (`signInWithPassword`); middleware refresh session; layout `(app)` gọi `getCurrentMember()`; owner thấy thêm tab `Quản lý` (/owner) trong nav.
- [ ] **Step 4:** PASS. **Step 5:** Commit `feat: auth and app layout`.

---

### Task 6: Học viên — danh sách + tạo hồ sơ

**Files:**
- Create: `lib/data/students.ts`, `app/(app)/students/page.tsx`, `app/(app)/students/new/page.tsx`, `app/(app)/students/actions.ts`, `components/ZaloButton.tsx`
- Test: `tests/e2e/students.spec.ts`

**Interfaces:**
- Consumes: `getCurrentMember`, `remainingSessions`, `zaloLink`, `normalizeVnPhone`
- Produces:
  - `listStudents(): Promise<StudentRow[]>` với `StudentRow = { id, fullName, phone, ptName, remaining: number | null, expiresOn: string | null }` (`remaining` theo gói mới nhất; `null` nếu chưa có gói)
  - server action `createStudent(form: FormData): Promise<{ error?: string }>` — trong một lần submit tạo `students` + `body_measurements` đầu tiên + `meal_plans` đầu tiên (nếu nhập) + `packages` + `student_availability[]`; redirect `/students/<id>`
  - `<ZaloButton phone message? />` — có message: copy vào clipboard rồi mở `zaloLink(phone)`; SĐT không hợp lệ → không render
- [ ] **Step 1: Failing e2e:** PT A tạo học viên với tên `Nguyễn Lan`, SĐT `0912 345 678`, năm sinh 1998, nữ, cao 160, cân 55, eo 68, mục tiêu `Giảm mỡ`, meal prep `Sáng: yến mạch...`, gói 12 buổi, rảnh Thứ 3 17:00–19:00 → về trang chi tiết; danh sách hiện `Nguyễn Lan` với `Còn 12 buổi`. Validation: thiếu tên → `Vui lòng nhập tên`; SĐT `123` → `Số điện thoại không hợp lệ`. PT B đăng nhập không thấy `Nguyễn Lan` và mở thẳng URL của học viên đó → trang `Không tìm thấy học viên`. Học viên còn ≤ 2 buổi hoặc gói hết hạn trong 7 ngày hiện nhãn `Sắp hết gói`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement; form dài chia section gập được (Thông tin, Số đo, Mục tiêu & sức khoẻ, Meal prep, Gói tập, Giờ rảnh); lưu SĐT đã normalize. **Step 4:** PASS. **Step 5:** Commit `feat: student list and profile creation`.

---

### Task 7: Chi tiết học viên — Hồ sơ / Tiến độ / Dinh dưỡng / Bài tập

**Files:**
- Create: `app/(app)/students/[id]/page.tsx` (tab qua `?tab=profile|progress|nutrition|workouts`), `components/MeasurementChart.tsx`, thêm actions vào `app/(app)/students/actions.ts`
- Test: `tests/e2e/student-detail.spec.ts`

**Interfaces:**
- Produces server actions: `updateStudentProfile(id, FormData)`, `addMeasurement(studentId, FormData)`, `addProgressNote(studentId, FormData)` (ảnh tuỳ chọn → upload bucket `progress-photos`, hiển thị bằng signed URL 1h), `addMealPlan(studentId, FormData)` (tạo bản mới; bản hiện hành = `effective_from` lớn nhất ≤ hôm nay VN), `addPackage(studentId, FormData)`, `setAvailability(studentId, windows: AvailabilityWindow[])`
- [ ] **Step 1: Failing e2e** (seed học viên của PT A có 2 lần đo):
  - Tab Hồ sơ hiện tuổi = năm hiện tại − năm sinh, số buổi còn lại, nút Zalo; sửa mục tiêu → lưu được.
  - Tab Tiến độ: bấm `Cập nhật tình trạng` → nhập cân 54, eo 66, nhận xét `Tiến bộ tốt` → bảng có 3 dòng, dòng mới nhất ở trên; biểu đồ render (`[data-testid=measurement-chart] svg`).
  - Tab Dinh dưỡng: thêm thực đơn mới → hiện là `Đang áp dụng`, bản cũ nằm trong `Lịch sử`.
  - Tab Bài tập: liệt kê `workout_content` của các buổi đã tập, mới nhất trước.
- [ ] **Step 2:** FAIL. **Step 3:** Implement (`recharts` LineChart cân nặng + eo). **Step 4:** PASS. **Step 5:** Commit `feat: student detail tabs with progress and nutrition`.

---

### Task 8: Lịch — Hôm nay, Tuần, tạo buổi

**Files:**
- Create: `lib/data/sessions.ts`, `app/(app)/today/page.tsx`, `app/(app)/week/page.tsx`, `app/(app)/sessions/new/page.tsx`, `app/(app)/sessions/actions.ts`, `components/SessionCard.tsx`
- Test: `tests/e2e/schedule.spec.ts`

**Interfaces:**
- Consumes: `vnDayRange`, `vnWeekRange`, `findConflicts`, `pendingChecklist`
- Produces:
  - `listSessions(range: { start: Date; end: Date }, ptId?: string): Promise<SessionLite & { studentName: string; ptName: string }[]>`
  - action `createSession(form: FormData): Promise<{ error?: string }>` — input: học viên, ngày, giờ bắt đầu, thời lượng (mặc định 60 phút); gắn `package_id` = gói mới nhất của học viên; trùng lịch → `Trùng lịch với <tên> lúc HH:mm–HH:mm`; gói còn ≤ 0 buổi → vẫn tạo và hiện cảnh báo `Học viên đã hết buổi trong gói`.
  - `<SessionCard>`: màu theo status (scheduled xám, confirmed xanh dương, done xanh lá, no_show cam, cancelled gạch ngang), badge `Chưa xong` khi `pendingChecklist(s, now).length > 0 && endAt <= now`
- [ ] **Step 1: Failing e2e:** PT A tạo buổi hôm nay 17:00 cho `Nguyễn Lan` → hiện trên `/today`; tạo buổi 17:30 cho học viên khác → lỗi trùng lịch; tạo 18:00 → OK (liền kề). `/week` hiện 7 cột/ngày (mobile: danh sách theo ngày) có buổi vừa tạo; điều hướng tuần trước/sau. Owner xem `/today` có bộ lọc PT.
- [ ] **Step 2:** FAIL. **Step 3:** Implement; nút nổi `+` mở `/sessions/new`; từ chi tiết slot trống trên `/today` có thể bấm để điền sẵn giờ. **Step 4:** PASS. **Step 5:** Commit `feat: today/week schedule and session creation`.

---

### Task 9: Chi tiết buổi — checklist, huỷ, gợi ý lấp slot

**Files:**
- Create: `app/(app)/sessions/[id]/page.tsx`; thêm actions vào `app/(app)/sessions/actions.ts`; `lib/data/fillIns.ts`
- Test: `tests/e2e/session-detail.spec.ts`

**Interfaces:**
- Consumes: `pendingChecklist`, `suggestFillIns`, `fillInInviteMessage`, `remainingSessions`, `<ZaloButton>`
- Produces:
  - actions `markOutcome(id, 'done'|'no_show')`, `setSigned(id, signed: boolean)` (set/clear `signed_at`), `saveWorkout(id, content: string | null)` (`null` = `Không cần` → `workout_logged = true`, content rỗng), `cancelSession(id, reason)`, `logMessage({ sessionId?, studentId, kind, content })` → `message_log` channel `manual`
  - `getFillInCandidates(sessionId): Promise<FillInCandidate[]>` — học viên chưa archive của cùng PT, trừ học viên của buổi bị huỷ
- [ ] **Step 1: Failing e2e:**
  - Buổi đã qua giờ: thấy 3 mục checklist `Kết quả buổi`, `Học viên đã ký`, `Bài tập hôm nay`; tick `Hoàn thành` + `Đã ký` + nhập bài tập → badge `Chưa xong` biến mất trên `/today`; số buổi còn lại của học viên giảm 1. Bỏ tick `Đã ký` → tăng lại 1.
  - Buổi chưa ký mà đã done → số buổi còn lại không đổi.
  - Huỷ buổi với lý do `Bận đột xuất` → hiện `Gợi ý lấp slot` với học viên seed rảnh khung đó; nút `Mời qua Zalo` có `href` bắt đầu bằng `https://zalo.me/0` và bấm sẽ ghi `message_log` kind `fill_in`. Bấm `Đặt buổi cho học viên này` → tạo buổi mới cùng giờ.
  - Không có ứng viên → `Không có học viên phù hợp khung giờ này`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. **Step 5:** Commit `feat: post-session checklist, cancel and fill-in suggestions`.

---

### Task 10: Nhắc lịch ngày mai + Web Push + cron

**Files:**
- Create: `app/(app)/reminders/page.tsx`, `app/api/push/subscribe/route.ts`, `app/api/cron/tick/route.ts`, `lib/push/send.ts`, `lib/cron/collectNotifications.ts`, `supabase/migrations/0003_cron.sql`; sửa `public/sw.js`, `app/(app)/settings/page.tsx`
- Test: `tests/unit/collectNotifications.test.ts`, `tests/e2e/reminders.spec.ts`

**Interfaces:**
- Consumes: `reminderMessage`, `needsChecklistPush`, `vnDayRange`, `<ZaloButton>`, `logMessage`
- Produces:
  - `collectNotifications(now: Date, data: { sessions: (SessionLite & { checklistPushedAt: Date | null; checklistRemindedAt: Date | null })[]; tomorrowCountByPt: Record<string, number>; remindedTomorrowByPt: Record<string, number>; pushLog: { memberId: string; kind: string; forDate: string }[] }): Notification[]` — thuần, test được. `Notification = { memberId: string; kind: 'checklist' | 'checklist_eod' | 'tomorrow'; title: string; body: string; url: string; sessionId?: string }`
  - `sendPush(memberId, payload): Promise<void>` — lỗi 404/410 thì xoá subscription
  - `POST /api/cron/tick` — yêu cầu header `Authorization: Bearer ${CRON_SECRET}`, sai → 401
- Rules (giờ VN):
  - `checklist`: buổi `needsChecklistPush` và `checklistPushedAt == null` → push `Buổi với <tên> đã xong` / `Kiểm tra: đã ký buổi? đã ghi bài tập?`, url `/sessions/<id>`; set `checklist_pushed_at`.
  - `checklist_eod`: lúc ≥ 21:00, mỗi PT 1 lần/ngày (`push_log`), nếu còn buổi hôm nay chưa xong checklist → `Còn N buổi hôm nay chưa hoàn tất`.
  - `tomorrow`: lúc ≥ 20:00, mỗi PT 1 lần/ngày, nếu `tomorrowCount − remindedTomorrow > 0` → `Bạn có N buổi mai chưa nhắc học viên`, url `/reminders`.
- [ ] **Step 1: Failing unit tests** cho 3 quy tắc: checklist không push lại khi `checklistPushedAt` có giá trị; `checklist_eod` không phát lúc 20:59 nhưng phát lúc 21:00 và không phát lần 2 khi đã có trong `pushLog`; `tomorrow` không phát khi tất cả buổi mai đã nhắc.
- [ ] **Step 2: Failing e2e:** `/reminders` liệt kê buổi ngày mai, mỗi dòng có nút `Nhắc qua Zalo` với nội dung đúng `reminderMessage`; bấm → dòng chuyển `Đã nhắc` (ghi `message_log` kind `reminder`). `POST /api/cron/tick` thiếu secret → 401; đúng secret → 200 `{ sent: number }`.
- [ ] **Step 3:** FAIL → Implement. `sw.js`: `push` → `showNotification(title, { body, data: { url } })`; `notificationclick` → mở/focus `url`. Trang Cài đặt: nút `Bật thông báo` (xin quyền, `pushManager.subscribe` với `VAPID_PUBLIC_KEY`, POST subscribe). Migration 0003: `pg_cron` mỗi 10 phút `net.http_post` tới `<APP_URL>/api/cron/tick` (URL + secret lấy từ Supabase Vault).
- [ ] **Step 4:** `npm run test && npm run e2e -- reminders` → PASS.
- [ ] **Step 5:** Commit `feat: tomorrow reminders, web push and cron tick`.

---

### Task 11: Màn Quản lý (owner)

**Files:**
- Create: `app/(app)/owner/page.tsx`, `app/(app)/owner/actions.ts`
- Test: `tests/e2e/owner.spec.ts`

**Interfaces:**
- Produces: action `invitePt(email, displayName)` (`auth.admin.inviteUserByEmail` + insert `members` role `pt`; chỉ owner, kiểm tra lại role phía server); báo cáo tháng: mỗi PT — số buổi `done`, số buổi `done` chưa ký, số buổi huỷ, số học viên đang tập.
- [ ] **Step 1: Failing e2e:** owner thấy bảng với PT A/PT B và số liệu khớp seed; chọn tháng trước/sau; danh sách `Buổi chưa ký` link tới từng buổi. PT A vào `/owner` → bị chuyển về `/today`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. **Step 5:** Commit `feat: owner overview and PT invite`.

---

### Task 12: Kiểm tra toàn luồng + README triển khai

**Files:**
- Create: `tests/e2e/full-flow.spec.ts`, `README.md`
- [ ] **Step 1:** E2E toàn luồng ở viewport 375px: PT đăng nhập → tạo học viên → đặt buổi → mở `/reminders` nhắc qua Zalo → buổi kết thúc (giả lập thời gian bằng `page.clock`) → checklist hoàn tất → huỷ buổi khác → mời lấp slot → owner thấy số liệu.
- [ ] **Step 2:** `npm run test && npx supabase test db && npm run e2e` → toàn bộ PASS; `npm run build` thành công; Lighthouse PWA "installable" đạt.
- [ ] **Step 3:** README: cài đặt local (Docker, `npx supabase start`, `.env.local`), tạo VAPID keys (`npx web-push generate-vapid-keys`), deploy Vercel + Supabase cloud, cấu hình cron, hướng dẫn PT cài lên màn hình chính (Android/iPhone).
- [ ] **Step 4:** Kiểm tra trên điện thoại thật: cài PWA, bật thông báo, nhận push checklist, nút Zalo mở đúng cuộc chat.
- [ ] **Step 5:** Commit `test: full-flow e2e and deployment README`.
