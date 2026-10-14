-- helpers ------------------------------------------------------------------
create or replace function public.current_member()
returns members
language sql stable security definer set search_path = public
as $$ select * from members where user_id = auth.uid() limit 1 $$;

create or replace function public.is_owner(gym uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from members
                 where user_id = auth.uid() and gym_id = gym and role = 'owner')
$$;

-- true when the caller owns the gym of the student, or is the student's PT
create or replace function public.can_access_student(sid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from students s
    join members m on m.user_id = auth.uid() and m.gym_id = s.gym_id
    where s.id = sid and (m.role = 'owner' or s.pt_id = m.id)
  )
$$;

alter table gyms enable row level security;
alter table members enable row level security;
alter table students enable row level security;
alter table body_measurements enable row level security;
alter table progress_notes enable row level security;
alter table meal_plans enable row level security;
alter table packages enable row level security;
alter table student_availability enable row level security;
alter table sessions enable row level security;
alter table message_log enable row level security;
alter table push_subscriptions enable row level security;
alter table push_log enable row level security;

create policy gyms_select on gyms for select to authenticated
  using (id = (public.current_member()).gym_id);

create policy members_select on members for select to authenticated
  using (gym_id = (public.current_member()).gym_id);

create policy students_all on students for all to authenticated
  using (
    gym_id = (public.current_member()).gym_id
    and (public.is_owner(gym_id) or pt_id = (public.current_member()).id)
  )
  with check (
    gym_id = (public.current_member()).gym_id
    and (public.is_owner(gym_id) or pt_id = (public.current_member()).id)
  );

-- tables hanging off a student share one policy shape
do $$
declare t text;
begin
  foreach t in array array['body_measurements','progress_notes','meal_plans','packages',
                           'student_availability','message_log']
  loop
    execute format(
      'create policy %I on %I for all to authenticated
         using (public.can_access_student(student_id))
         with check (public.can_access_student(student_id)
                     and gym_id = (public.current_member()).gym_id)',
      t || '_all', t);
  end loop;
end $$;

create policy sessions_all on sessions for all to authenticated
  using (
    gym_id = (public.current_member()).gym_id
    and (public.is_owner(gym_id) or pt_id = (public.current_member()).id)
  )
  with check (
    gym_id = (public.current_member()).gym_id
    and (public.is_owner(gym_id) or pt_id = (public.current_member()).id)
    and public.can_access_student(student_id)
  );

create policy push_subs_own on push_subscriptions for all to authenticated
  using (member_id = (public.current_member()).id)
  with check (member_id = (public.current_member()).id
              and gym_id = (public.current_member()).gym_id);

create policy push_log_own on push_log for select to authenticated
  using (member_id = (public.current_member()).id);

-- storage: progress-photos/<gym_id>/<student_id>/<file>
create policy progress_photos_rw on storage.objects for all to authenticated
  using (
    bucket_id = 'progress-photos'
    and public.can_access_student(((storage.foldername(name))[2])::uuid)
  )
  with check (
    bucket_id = 'progress-photos'
    and public.can_access_student(((storage.foldername(name))[2])::uuid)
  );
