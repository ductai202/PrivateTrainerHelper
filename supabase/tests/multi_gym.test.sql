begin;
select plan(12);

-- Fixture (as superuser): an admin who owns BOTH gyms, an owner of gym 2 only, a PT in gym 2.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.multi@demo.test', 'x', now(), '{"platform_admin":true}', '{}', now(), now(), '', '', '', ''),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'owner2.multi@demo.test', 'x', now(), '{}', '{}', now(), now(), '', '', '', ''),
  ('aaaaaaaa-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pt2.multi@demo.test', 'x', now(), '{}', '{}', now(), now(), '', '', '', '');

insert into gyms (id, name) values ('22222222-0000-0000-0000-000000000002', 'Gym Two');

insert into members (id, gym_id, user_id, display_name, role) values
  ('bbbbbbbb-0000-0000-0000-0000000000a1', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Admin', 'owner'),
  ('bbbbbbbb-0000-0000-0000-0000000000a4', '22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Admin', 'owner'),
  ('bbbbbbbb-0000-0000-0000-0000000000a2', '22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-0000000000a2', 'Owner Two', 'owner'),
  ('bbbbbbbb-0000-0000-0000-0000000000a3', '22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-0000000000a3', 'PT Two', 'pt');

insert into students (id, gym_id, pt_id, full_name, phone) values
  ('cccccccc-0000-0000-0000-0000000000c1', '22222222-0000-0000-0000-000000000002',
   'bbbbbbbb-0000-0000-0000-0000000000a3', 'Student Two', '0900000099');

create temp table _exp as
select (select count(*) from students
        where gym_id in ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002'))::int as all_students,
       (select count(*) from students where gym_id = '22222222-0000-0000-0000-000000000002')::int as gym2_students,
       2 as all_gyms; -- the admin owns exactly two centers; any other seeded center must stay invisible
grant select on _exp to authenticated;

-- admin: owner in both gyms ----------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is((select count(*) from gyms)::int, (select all_gyms from _exp), 'admin sees every center');
select is((select count(*) from students)::int, (select all_students from _exp), 'admin sees the students of every center');

select lives_ok(
  $$insert into students (gym_id, pt_id, full_name, phone)
    values ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-0000000000a3', 'Added By Admin', '0900000098')$$,
  'admin can add a student to the second center');

select throws_ok(
  $$insert into students (gym_id, pt_id, full_name, phone)
    values ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'Wrong PT', '0900000097')$$,
  '42501', null, 'admin cannot assign a PT of another center to a student');

select throws_ok(
  $$insert into body_measurements (gym_id, student_id, measured_on, weight_kg)
    values ('11111111-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-0000000000c1', current_date, 60)$$,
  '42501', null, 'a measurement cannot be stamped with another center than its student');

select lives_ok(
  $$insert into body_measurements (gym_id, student_id, measured_on, weight_kg)
    values ('22222222-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-0000000000c1', current_date, 60)$$,
  'admin can record a measurement in the right center');

-- owner of gym 2 only ----------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is((select count(*) from gyms)::int, 1, 'a center owner sees only their center');
select is((select count(*) from students where gym_id <> '22222222-0000-0000-0000-000000000002')::int, 0,
          'a center owner sees no student of another center');
select is((select count(*) from students)::int, (select gym2_students from _exp) + 1,
          'a center owner sees all students of their center, including the one the admin added');

-- PT of gym 2 ------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is((select count(*) from students)::int, (select gym2_students from _exp) + 1, 'a PT sees their own students');

-- PT of gym 1 stays isolated ---------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*) from students where gym_id = '22222222-0000-0000-0000-000000000002')::int, 0,
          'a PT of the first center sees nothing of the second');
select is((select count(*) from gyms)::int, 1, 'a PT sees only their own center');

select * from finish();
rollback;
