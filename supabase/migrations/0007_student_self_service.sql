-- Phase 2/3: student personal link, reschedule requests, waitlist, link revocation,
-- bot hardening (update dedupe, link-code attempt limit, 2h precheck marker).

alter table students
  add column link_version int not null default 1;

alter table sessions
  add column link_revoked_at timestamptz,
  add column bot_precheck_sent_at timestamptz;

-- message kinds the app logs
alter table message_log drop constraint message_log_kind_check;
alter table message_log
  add constraint message_log_kind_check
  check (kind in ('reminder', 'fill_in', 'precheck', 'waitlist'));

create table reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  requested_start timestamptz not null,
  requested_end timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (requested_end > requested_start)
);
create index reschedule_requests_session_idx on reschedule_requests (session_id);

create table waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index waitlist_one_active_per_student
  on waitlist_entries (student_id) where active;

-- dedupe of webhook deliveries and brute-force protection of link codes (service role only)
create table bot_updates (
  update_id text primary key,
  received_at timestamptz not null default now()
);
create table bot_link_attempts (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  attempted_at timestamptz not null default now()
);
create index bot_link_attempts_chat_idx on bot_link_attempts (chat_id, attempted_at);

alter table reschedule_requests enable row level security;
alter table waitlist_entries enable row level security;
alter table bot_updates enable row level security;
alter table bot_link_attempts enable row level security;

create policy reschedule_requests_all on reschedule_requests for all to authenticated
  using (public.can_access_student(student_id))
  with check (public.can_access_student(student_id)
              and gym_id = (public.current_member()).gym_id);

create policy waitlist_entries_all on waitlist_entries for all to authenticated
  using (public.can_access_student(student_id))
  with check (public.can_access_student(student_id)
              and gym_id = (public.current_member()).gym_id);
-- bot_updates / bot_link_attempts: RLS on with no policy = service role only
