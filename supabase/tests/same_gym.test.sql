begin;
select plan(2);

-- a second gym with its own PT, created as superuser
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change, email_change_token_new)
values ('aaaaaaaa-0000-0000-0000-0000000000ff', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'other.pt@demo.test', 'x', now(),
        '{}', '{}', now(), now(), '', '', '', '');
insert into gyms (id, name) values ('22222222-0000-0000-0000-000000000002', 'Other Gym');
insert into members (id, gym_id, user_id, display_name, role)
values ('bbbbbbbb-0000-0000-0000-0000000000ff', '22222222-0000-0000-0000-000000000002',
        'aaaaaaaa-0000-0000-0000-0000000000ff', 'Other PT', 'pt');

-- the owner of the demo gym tries to assign that foreign PT
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$insert into students (gym_id, pt_id, full_name, phone)
    values ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-0000000000ff',
            'X', '0900000000')$$,
  '42501', null, 'owner cannot assign a PT from another gym to a student');

select throws_ok(
  $$insert into sessions (gym_id, pt_id, student_id, start_at, end_at)
    values ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-0000000000ff',
            'cccccccc-0000-0000-0000-000000000001', now(), now() + interval '1 hour')$$,
  '42501', null, 'owner cannot book a session with a PT from another gym');

select * from finish();
rollback;
