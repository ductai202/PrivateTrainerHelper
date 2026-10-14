begin;
select plan(9);

-- expected numbers are computed as superuser so the test also holds on a database
-- that already contains e2e data
create temp table _exp as
select
  (select count(*) from students where pt_id = 'bbbbbbbb-0000-0000-0000-000000000002')::int as pt_a_students,
  (select count(*) from students)::int as all_students,
  (select count(*) from sessions)::int as all_sessions;
grant select on _exp to authenticated, anon;

-- PT A ----------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is((select count(*) from students)::int, (select pt_a_students from _exp), 'PT A sees only own students');
select is((select count(*) from students where pt_id = 'bbbbbbbb-0000-0000-0000-000000000003')::int, 0,
          'PT A sees none of PT B students');

with u as (
  update students set full_name = 'hacked'
  where pt_id = 'bbbbbbbb-0000-0000-0000-000000000003' returning 1)
select is((select count(*) from u)::int, 0, 'PT A cannot update PT B students');

select throws_ok(
  $$insert into sessions (gym_id, pt_id, student_id, start_at, end_at)
    values ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003',
            'cccccccc-0000-0000-0000-000000000003', now(), now() + interval '1 hour')$$,
  '42501', null, 'PT A cannot create session for PT B');

select is((select count(*) from body_measurements
           where student_id = 'cccccccc-0000-0000-0000-000000000003')::int, 0,
          'PT A cannot read PT B measurements');

-- owner ---------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from students)::int, (select all_students from _exp), 'owner sees all students');
select is((select count(*) from sessions)::int, (select all_sessions from _exp), 'owner sees all sessions');

-- anon ----------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*) from students)::int, 0, 'anon sees no students');
reset role;
select ok(true, 'done');

select * from finish();
rollback;
