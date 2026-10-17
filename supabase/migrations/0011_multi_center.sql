-- Several centers (gyms), several memberships per user.
-- The admin owns every center; a center owner / PT stays confined to their own center.
-- Policies used `(current_member()).gym_id`, which assumes ONE membership per user; they now ask
-- "is the caller a member of this gym?" instead.

create or replace function public.is_gym_member(gym uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from members where user_id = auth.uid() and gym_id = gym) $$;

create or replace function public.is_my_member(mid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from members where id = mid and user_id = auth.uid()) $$;

create or replace function public.student_gym(sid uuid)
returns uuid
language sql stable security definer set search_path = public
as $$ select gym_id from students where id = sid $$;

drop policy gyms_select on gyms;
create policy gyms_select on gyms for select to authenticated
  using (public.is_gym_member(id));

drop policy members_select on members;
create policy members_select on members for select to authenticated
  using (public.is_gym_member(gym_id));

drop policy students_all on students;
create policy students_all on students for all to authenticated
  using (
    public.is_gym_member(gym_id)
    and (public.is_owner(gym_id) or public.is_my_member(pt_id))
  )
  with check (
    public.is_gym_member(gym_id)
    and public.member_in_gym(pt_id, gym_id)
    and (public.is_owner(gym_id) or public.is_my_member(pt_id))
  );

do $$
declare t text;
begin
  foreach t in array array['body_measurements','progress_notes','meal_plans','packages',
                           'student_availability','message_log','reschedule_requests','waitlist_entries']
  loop
    execute format('drop policy %I on %I', t || '_all', t);
    execute format(
      'create policy %I on %I for all to authenticated
         using (public.can_access_student(student_id))
         with check (public.can_access_student(student_id)
                     and public.is_gym_member(gym_id)
                     and gym_id = public.student_gym(student_id))',
      t || '_all', t);
  end loop;
end $$;

drop policy sessions_all on sessions;
create policy sessions_all on sessions for all to authenticated
  using (
    public.is_gym_member(gym_id)
    and (public.is_owner(gym_id) or public.is_my_member(pt_id))
  )
  with check (
    public.is_gym_member(gym_id)
    and public.member_in_gym(pt_id, gym_id)
    and (public.is_owner(gym_id) or public.is_my_member(pt_id))
    and public.can_access_student(student_id)
    and gym_id = public.student_gym(student_id)
  );

drop policy push_subs_own on push_subscriptions;
create policy push_subs_own on push_subscriptions for all to authenticated
  using (public.is_my_member(member_id))
  with check (public.is_my_member(member_id) and public.is_gym_member(gym_id));

drop policy push_log_own on push_log;
create policy push_log_own on push_log for select to authenticated
  using (public.is_my_member(member_id));
