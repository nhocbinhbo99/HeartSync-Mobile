-- HeartSync authorization helpers, RLS, least-privilege grants, and atomic RPCs.

create or replace function private.is_blocked_between(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
       or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
  );
$$;

create or replace function private.is_eligible_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.profile_private pp on pp.user_id = p.id
    where p.id = p_user_id
      and p.profile_completed_at is not null
      and pp.date_of_birth <= (current_date - interval '18 years')::date
  );
$$;

create or replace function private.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      p_profile_id = (select auth.uid())
      or (
        private.is_eligible_profile(p_profile_id)
        and not private.is_blocked_between((select auth.uid()), p_profile_id)
      )
    );
$$;

create or replace function private.can_read_match_history(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id
      and (select auth.uid()) in (m.user_low_id, m.user_high_id)
      and not private.is_blocked_between(m.user_low_id, m.user_high_id)
  );
$$;

create or replace function private.can_use_active_match(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id
      and m.status = 'active'
      and (select auth.uid()) in (m.user_low_id, m.user_high_id)
      and not private.is_blocked_between(m.user_low_id, m.user_high_id)
  );
$$;

revoke execute on function private.is_blocked_between(uuid, uuid) from public, anon;
revoke execute on function private.is_eligible_profile(uuid) from public, anon;
revoke execute on function private.can_view_profile(uuid) from public, anon;
revoke execute on function private.can_read_match_history(uuid) from public, anon;
revoke execute on function private.can_use_active_match(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function private.is_eligible_profile(uuid) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;
grant execute on function private.can_read_match_history(uuid) to authenticated;
grant execute on function private.can_use_active_match(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.profile_photos enable row level security;
alter table public.interests enable row level security;
alter table public.profile_interests enable row level security;
alter table public.profile_languages enable row level security;
alter table public.user_preferences enable row level security;
alter table public.saved_profiles enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.calls enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

revoke all on table
  public.profiles,
  public.profile_private,
  public.profile_photos,
  public.interests,
  public.profile_interests,
  public.profile_languages,
  public.user_preferences,
  public.saved_profiles,
  public.swipes,
  public.matches,
  public.messages,
  public.calls,
  public.blocks,
  public.reports
from anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.profile_private to authenticated;
grant select, insert, update, delete on public.profile_photos to authenticated;
grant select on public.interests to authenticated;
grant select, insert, delete on public.profile_interests to authenticated;
grant select, insert, delete on public.profile_languages to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, delete on public.saved_profiles to authenticated;
grant select on public.swipes to authenticated;
grant select on public.matches to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.calls to authenticated;
grant select, delete on public.blocks to authenticated;
grant select, insert on public.reports to authenticated;

create policy profiles_select on public.profiles for select to authenticated
using ((select private.can_view_profile(id)));
create policy profiles_insert_own on public.profiles for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy profile_private_select_own on public.profile_private for select to authenticated
using ((select auth.uid()) = user_id);
create policy profile_private_insert_own on public.profile_private for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy profile_private_update_own on public.profile_private for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy profile_photos_select_visible on public.profile_photos for select to authenticated
using ((select private.can_view_profile(profile_id)));
create policy profile_photos_insert_own on public.profile_photos for insert to authenticated
with check ((select auth.uid()) = profile_id and storage_path like profile_id::text || '/%');
create policy profile_photos_update_own on public.profile_photos for update to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id and storage_path like profile_id::text || '/%');
create policy profile_photos_delete_own on public.profile_photos for delete to authenticated
using ((select auth.uid()) = profile_id);

create policy interests_select_authenticated on public.interests for select to authenticated
using ((select auth.uid()) is not null);

create policy profile_interests_select_visible on public.profile_interests for select to authenticated
using ((select private.can_view_profile(profile_id)));
create policy profile_interests_insert_own on public.profile_interests for insert to authenticated
with check ((select auth.uid()) = profile_id);
create policy profile_interests_delete_own on public.profile_interests for delete to authenticated
using ((select auth.uid()) = profile_id);

create policy profile_languages_select_visible on public.profile_languages for select to authenticated
using ((select private.can_view_profile(profile_id)));
create policy profile_languages_insert_own on public.profile_languages for insert to authenticated
with check ((select auth.uid()) = profile_id);
create policy profile_languages_delete_own on public.profile_languages for delete to authenticated
using ((select auth.uid()) = profile_id);

create policy preferences_select_own on public.user_preferences for select to authenticated
using ((select auth.uid()) = user_id);
create policy preferences_insert_own on public.user_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy preferences_update_own on public.user_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy preferences_delete_own on public.user_preferences for delete to authenticated
using ((select auth.uid()) = user_id);

create policy saved_profiles_select_own on public.saved_profiles for select to authenticated
using ((select auth.uid()) = owner_id);
create policy saved_profiles_insert_own on public.saved_profiles for insert to authenticated
with check ((select auth.uid()) = owner_id and (select private.can_view_profile(target_id)));
create policy saved_profiles_delete_own on public.saved_profiles for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy swipes_select_own on public.swipes for select to authenticated
using ((select auth.uid()) = actor_id);

create policy matches_select_participant on public.matches for select to authenticated
using ((select private.can_read_match_history(id)));

create policy messages_select_participant on public.messages for select to authenticated
using ((select private.can_read_match_history(match_id)));
create policy messages_insert_active_match on public.messages for insert to authenticated
with check (
  (select auth.uid()) = sender_id
  and (select private.can_use_active_match(match_id))
);

create policy calls_select_participant on public.calls for select to authenticated
using ((select private.can_read_match_history(match_id)));

create policy blocks_select_own on public.blocks for select to authenticated
using ((select auth.uid()) = blocker_id);
create policy blocks_delete_own on public.blocks for delete to authenticated
using ((select auth.uid()) = blocker_id);

create policy reports_select_own on public.reports for select to authenticated
using ((select auth.uid()) = reporter_id);
create policy reports_insert_own on public.reports for insert to authenticated
with check ((select auth.uid()) = reporter_id);

create or replace function public.record_swipe(p_target_id uuid, p_action public.swipe_action)
returns table(outcome text, match_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_low_id uuid;
  v_high_id uuid;
  v_match_id uuid;
  v_match_status public.match_status;
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if p_target_id is null or p_target_id = v_actor_id or p_action is null then
    raise exception using errcode = '22023', message = 'invalid_swipe_target';
  end if;

  v_low_id := least(v_actor_id, p_target_id);
  v_high_id := greatest(v_actor_id, p_target_id);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_low_id::text || ':' || v_high_id::text, 0));

  select m.id, m.status into v_match_id, v_match_status
  from public.matches m
  where m.user_low_id = v_low_id and m.user_high_id = v_high_id;

  if v_match_status = 'unmatched' then
    raise exception using errcode = 'P0001', message = 'rematch_not_supported_in_base';
  elsif v_match_status = 'active' then
    return query select 'matched'::text, v_match_id;
    return;
  end if;

  if not private.is_eligible_profile(v_actor_id) or not private.is_eligible_profile(p_target_id) then
    raise exception using errcode = '22023', message = 'profile_not_eligible';
  end if;
  if private.is_blocked_between(v_actor_id, p_target_id) then
    raise exception using errcode = '42501', message = 'interaction_blocked';
  end if;

  insert into public.swipes(actor_id, target_id, action)
  values (v_actor_id, p_target_id, p_action)
  on conflict (actor_id, target_id) do update set action = excluded.action, updated_at = now();

  if p_action = 'pass' then
    return query select 'passed'::text, null::uuid;
    return;
  end if;

  if exists (
    select 1 from public.swipes s
    where s.actor_id = p_target_id and s.target_id = v_actor_id and s.action = 'like'
  ) then
    insert into public.matches(user_low_id, user_high_id)
    values (v_low_id, v_high_id)
    on conflict (user_low_id, user_high_id) do nothing
    returning id into v_match_id;

    if v_match_id is null then
      select m.id, m.status into v_match_id, v_match_status
      from public.matches m
      where m.user_low_id = v_low_id and m.user_high_id = v_high_id;
      if v_match_status <> 'active' then
        raise exception using errcode = 'P0001', message = 'rematch_not_supported_in_base';
      end if;
    end if;
    return query select 'matched'::text, v_match_id;
    return;
  end if;

  return query select 'liked'::text, null::uuid;
end;
$$;

create or replace function public.unmatch(p_match_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_result uuid;
begin
  if v_actor_id is null then raise exception using errcode = '28000', message = 'authentication_required'; end if;
  update public.matches m
  set status = 'unmatched', unmatched_at = now(), unmatched_by = v_actor_id
  where m.id = p_match_id and m.status = 'active' and v_actor_id in (m.user_low_id, m.user_high_id)
  returning m.id into v_result;
  if v_result is null then
    select m.id into v_result from public.matches m
    where m.id = p_match_id and m.status = 'unmatched' and v_actor_id in (m.user_low_id, m.user_high_id);
  end if;
  if v_result is null then raise exception using errcode = '42501', message = 'match_access_denied'; end if;
  return v_result;
end;
$$;

create or replace function public.block_user(p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_low_id uuid;
  v_high_id uuid;
begin
  if v_actor_id is null then raise exception using errcode = '28000', message = 'authentication_required'; end if;
  if p_target_id is null or p_target_id = v_actor_id then
    raise exception using errcode = '22023', message = 'invalid_block_target';
  end if;
  insert into public.blocks(blocker_id, blocked_id) values (v_actor_id, p_target_id)
  on conflict (blocker_id, blocked_id) do nothing;
  v_low_id := least(v_actor_id, p_target_id);
  v_high_id := greatest(v_actor_id, p_target_id);
  update public.matches
  set status = 'unmatched', unmatched_at = now(), unmatched_by = v_actor_id
  where user_low_id = v_low_id and user_high_id = v_high_id and status = 'active';
end;
$$;

create or replace function public.start_call(p_match_id uuid, p_type public.call_type)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_callee_id uuid;
  v_call_id uuid;
begin
  if v_actor_id is null then raise exception using errcode = '28000', message = 'authentication_required'; end if;
  if not private.can_use_active_match(p_match_id) then
    raise exception using errcode = '42501', message = 'active_match_required';
  end if;
  select case when m.user_low_id = v_actor_id then m.user_high_id else m.user_low_id end
  into v_callee_id from public.matches m where m.id = p_match_id;
  insert into public.calls(match_id, caller_id, callee_id, type)
  values (p_match_id, v_actor_id, v_callee_id, p_type)
  returning id into v_call_id;
  return v_call_id;
end;
$$;

revoke execute on function public.record_swipe(uuid, public.swipe_action) from public, anon;
revoke execute on function public.unmatch(uuid) from public, anon;
revoke execute on function public.block_user(uuid) from public, anon;
revoke execute on function public.start_call(uuid, public.call_type) from public, anon;
grant execute on function public.record_swipe(uuid, public.swipe_action) to authenticated;
grant execute on function public.unmatch(uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.start_call(uuid, public.call_type) to authenticated;
