-- Local demo data. Password for every demo user: demo12345 (local only).
-- gym 1111…, users: owner / pt.a / pt.b @demo.test

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'owner@demo.test', crypt('demo12345', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'pt.a@demo.test', crypt('demo12345', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'pt.b@demo.test', crypt('demo12345', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@demo.test';

insert into gyms (id, name) values ('11111111-0000-0000-0000-000000000001', 'Demo Gym');

insert into members (id, gym_id, user_id, display_name, role, gender, birth_year) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Chủ gym', 'owner', 'male', 1985),
  ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'PT An', 'pt', 'male', 1992),
  ('bbbbbbbb-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'PT Bình', 'pt', 'female', 1996);

insert into students (id, gym_id, pt_id, full_name, phone, birth_year, gender, height_cm, goal) values
  ('cccccccc-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Học viên A1', '0900000001', 1995, 'female', 160, 'Giảm mỡ'),
  ('cccccccc-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Học viên A2', '0900000002', 1990, 'male', 172, 'Tăng cơ'),
  ('cccccccc-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'Học viên B1', '0900000003', 1998, 'female', 158, 'Săn chắc'),
  ('cccccccc-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'Học viên B2', '0900000004', 1988, 'male', 175, 'Giảm cân');

insert into packages (id, gym_id, student_id, total_sessions, start_date) values
  ('dddddddd-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 12, current_date - 30),
  ('dddddddd-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002', 12, current_date - 30),
  ('dddddddd-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 12, current_date - 30),
  ('dddddddd-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000004', 12, current_date - 30);

insert into body_measurements (gym_id, student_id, measured_on, weight_kg, waist_cm) values
  ('11111111-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', current_date - 30, 58, 72),
  ('11111111-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', current_date - 14, 56, 70);

-- every demo student is free every day 06:00-21:00 (all weekdays)
insert into student_availability (gym_id, student_id, weekday, from_time, to_time)
select '11111111-0000-0000-0000-000000000001', s.id, d, '06:00', '21:00'
from students s, generate_series(0, 6) d;

-- sessions: PT A has two earlier today (UTC date +7h approximated), PT B one
insert into sessions (gym_id, pt_id, student_id, package_id, start_at, end_at, status, student_signed, workout_logged) values
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001', now() - interval '3 days', now() - interval '3 days' + interval '1 hour', 'done', true, true),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003',
   'dddddddd-0000-0000-0000-000000000003', now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 'done', false, false);

-- ---------------------------------------------------------------------------------------------
-- Second center + a platform admin who owns both centers (demo password demo12345, local only).
--   admin@demo.test   platform admin, owner of Demo Gym and Demo Gym 2
--   owner2@demo.test  owner of Demo Gym 2 only
--   pt.c@demo.test    PT in Demo Gym 2
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000010', 'authenticated', 'authenticated',
   'admin@demo.test', crypt('demo12345', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"],"platform_admin":true}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000011', 'authenticated', 'authenticated',
   'owner2@demo.test', crypt('demo12345', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000012', 'authenticated', 'authenticated',
   'pt.c@demo.test', crypt('demo12345', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email),
       'email', now(), now(), now()
from auth.users u
where u.email in ('admin@demo.test', 'owner2@demo.test', 'pt.c@demo.test');

insert into gyms (id, name) values ('33333333-0000-0000-0000-000000000003', 'Demo Gym 2');

insert into members (id, gym_id, user_id, display_name, role, gender, birth_year, created_at) values
  ('bbbbbbbb-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000010', 'Admin', 'owner', 'male', 1990, now() - interval '2 minutes'),
  ('bbbbbbbb-0000-0000-0000-000000000011', '33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000010', 'Admin', 'owner', 'male', 1990, now() - interval '1 minute'),
  ('bbbbbbbb-0000-0000-0000-000000000012', '33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000011', 'Chủ gym 2', 'owner', 'female', 1984, now()),
  ('bbbbbbbb-0000-0000-0000-000000000013', '33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000012', 'PT Cường', 'pt', 'male', 1993, now());

insert into students (id, gym_id, pt_id, full_name, phone, birth_year, gender, height_cm, goal) values
  ('cccccccc-0000-0000-0000-000000000011', '33333333-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000013',
   'Học viên C1', '0900000011', 1996, 'female', 162, 'Tăng cơ mông');

insert into packages (id, gym_id, student_id, total_sessions, start_date) values
  ('dddddddd-0000-0000-0000-000000000011', '33333333-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000011', 10, current_date - 10);

insert into student_availability (gym_id, student_id, weekday, from_time, to_time)
select '33333333-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000011', d, '06:00', '21:00'
from generate_series(0, 6) d;
