-- A student or session may only reference a PT of the same gym.
create or replace function public.member_in_gym(member uuid, gym uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from members where id = member and gym_id = gym) $$;

drop policy students_all on students;
create policy students_all on students for all to authenticated
  using (
    gym_id = (public.current_member()).gym_id
    and (public.is_owner(gym_id) or pt_id = (public.current_member()).id)
  )
  with check (
    gym_id = (public.current_member()).gym_id
    and public.member_in_gym(pt_id, gym_id)
    and (public.is_owner(gym_id) or pt_id = (public.current_member()).id)
  );

drop policy sessions_all on sessions;
create policy sessions_all on sessions for all to authenticated
  using (
    gym_id = (public.current_member()).gym_id
    and (public.is_owner(gym_id) or pt_id = (public.current_member()).id)
  )
  with check (
    gym_id = (public.current_member()).gym_id
    and public.member_in_gym(pt_id, gym_id)
    and (public.is_owner(gym_id) or pt_id = (public.current_member()).id)
    and public.can_access_student(student_id)
  );
