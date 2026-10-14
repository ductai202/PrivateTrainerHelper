create extension if not exists pgcrypto;

create table gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('owner','pt')),
  created_at timestamptz not null default now(),
  unique (gym_id, user_id)
);

create table students (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  pt_id uuid not null references members(id),
  full_name text not null,
  phone text not null,
  birth_year int,
  gender text check (gender in ('male','female','other')),
  height_cm numeric,
  goal text,
  health_notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table body_measurements (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  measured_on date not null,
  weight_kg numeric, chest_cm numeric, waist_cm numeric, hip_cm numeric,
  thigh_cm numeric, arm_cm numeric, body_fat_pct numeric,
  note text,
  created_at timestamptz not null default now()
);

create table progress_notes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  noted_on date not null,
  content text not null,
  photo_path text,
  created_at timestamptz not null default now()
);

create table meal_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  effective_from date not null,
  calories int, protein_g int, carbs_g int, fat_g int,
  content text not null,
  note text,
  created_at timestamptz not null default now()
);

create table packages (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  total_sessions int not null check (total_sessions > 0),
  start_date date not null,
  expires_on date,
  created_at timestamptz not null default now()
);

create table student_availability (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  from_time time not null,
  to_time time not null,
  check (from_time < to_time),
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  pt_id uuid not null references members(id),
  student_id uuid not null references students(id) on delete cascade,
  package_id uuid references packages(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled','confirmed','cancelled','done','no_show')),
  cancel_reason text,
  student_signed boolean not null default false,
  signed_at timestamptz,
  workout_logged boolean not null default false,
  workout_content text,
  checklist_pushed_at timestamptz,
  checklist_reminded_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index sessions_pt_start_idx on sessions (pt_id, start_at);
create index sessions_student_start_idx on sessions (student_id, start_at);

create table message_log (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  student_id uuid not null references students(id) on delete cascade,
  channel text not null check (channel in ('manual','bot','zns')),
  kind text not null check (kind in ('reminder','fill_in')),
  content text not null,
  sent_at timestamptz not null default now()
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table push_log (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  kind text not null,
  for_date date not null,
  created_at timestamptz not null default now(),
  unique (member_id, kind, for_date)
);

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;
