-- MVP-facing server contracts. This migration is intentionally forward-only:
-- the three BASE migrations have already been applied to heartsync-dev.

do $$
begin
  if exists (select 1 from public.profile_photos where sort_order > 5) then
    raise exception 'Cannot lower photo limit while a profile has more than six photos';
  end if;
end;
$$;

alter table public.profile_photos
  drop constraint profile_photos_sort_order_check,
  add constraint profile_photos_sort_order_check check (sort_order between 0 and 5);

alter table public.user_preferences alter column distance_km drop not null;

-- This helper is deliberately private. Public RPCs below decide when it is safe
-- to return the derived age and never serialize date_of_birth or coordinates.
create or replace function private.profile_public_json(p_profile_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'displayName', p.display_name,
    'age', extract(year from age(current_date, pp.date_of_birth))::integer,
    'gender', p.gender,
    'bio', p.bio,
    'occupation', p.occupation,
    'education', p.education,
    'publicLocation', p.public_location,
    'profileCompletedAt', p.profile_completed_at,
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', photo.id,
        'storagePath', photo.storage_path,
        'sortOrder', photo.sort_order,
        'isPrimary', photo.is_primary
      ) order by photo.sort_order)
      from public.profile_photos photo
      where photo.profile_id = p.id
    ), '[]'::jsonb),
    'interests', coalesce((
      select jsonb_agg(i.label order by i.label)
      from public.profile_interests pi
      join public.interests i on i.id = pi.interest_id
      where pi.profile_id = p.id
    ), '[]'::jsonb),
    'languages', coalesce((
      select jsonb_agg(pl.language_code order by pl.language_code)
      from public.profile_languages pl
      where pl.profile_id = p.id
    ), '[]'::jsonb)
  )
  from public.profiles p
  join public.profile_private pp on pp.user_id = p.id
  where p.id = p_profile_id;
$$;

revoke execute on function private.profile_public_json(uuid) from public, anon, authenticated;

create or replace function public.get_public_profile(p_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if p_profile_id is null or not private.can_view_profile(p_profile_id) then
    raise exception using errcode = '42501', message = 'profile_access_denied';
  end if;
  return private.profile_public_json(p_profile_id);
end;
$$;

create or replace function public.get_discovery_candidates(
  p_age_min smallint,
  p_age_max smallint,
  p_distance_km smallint default null,
  p_preferred_genders text[] default '{}',
  p_preferred_languages text[] default '{}',
  p_limit integer default 20,
  p_cursor_created_at timestamptz default null
)
returns table(profile jsonb, cursor_created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if p_age_min is null or p_age_max is null or p_age_min < 18 or p_age_max > 120 or p_age_min > p_age_max then
    raise exception using errcode = '22023', message = 'invalid_age_filter';
  end if;
  if p_distance_km is not null and (p_distance_km < 1 or p_distance_km > 500) then
    raise exception using errcode = '22023', message = 'invalid_distance_filter';
  end if;
  if not private.is_eligible_profile(v_actor_id) then
    raise exception using errcode = '22023', message = 'profile_not_eligible';
  end if;

  return query
  with actor_private as (
    select pp.latitude, pp.longitude, pp.location_consent
    from public.profile_private pp
    where pp.user_id = v_actor_id
  )
  select private.profile_public_json(p.id), p.created_at
  from public.profiles p
  join public.profile_private candidate_private on candidate_private.user_id = p.id
  cross join actor_private actor_location
  where p.id <> v_actor_id
    and p.profile_completed_at is not null
    and candidate_private.date_of_birth <= (current_date - interval '18 years')::date
    and extract(year from age(current_date, candidate_private.date_of_birth)) between p_age_min and p_age_max
    and not private.is_blocked_between(v_actor_id, p.id)
    and not exists (
      select 1 from public.swipes s where s.actor_id = v_actor_id and s.target_id = p.id
    )
    and (cardinality(coalesce(p_preferred_genders, '{}')) = 0 or p.gender = any(p_preferred_genders))
    and (
      cardinality(coalesce(p_preferred_languages, '{}')) = 0
      or exists (
        select 1 from public.profile_languages language
        where language.profile_id = p.id and language.language_code = any(p_preferred_languages)
      )
    )
    and (
      p_distance_km is null
      or (
        actor_location.location_consent
        and actor_location.latitude is not null
        and actor_location.longitude is not null
        and candidate_private.location_consent
        and candidate_private.latitude is not null
        and candidate_private.longitude is not null
        and 6371 * acos(least(1::double precision, greatest(-1::double precision,
          cos(radians(actor_location.latitude::double precision))
          * cos(radians(candidate_private.latitude::double precision))
          * cos(radians(candidate_private.longitude::double precision) - radians(actor_location.longitude::double precision))
          + sin(radians(actor_location.latitude::double precision))
          * sin(radians(candidate_private.latitude::double precision))
        ))) <= p_distance_km
      )
    )
    and (p_cursor_created_at is null or p.created_at < p_cursor_created_at)
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$$;

create or replace function public.list_active_matches(
  p_limit integer default 30,
  p_cursor_created_at timestamptz default null
)
returns table(
  id uuid,
  other_profile jsonb,
  created_at timestamptz,
  last_message_preview text,
  cursor_created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    private.profile_public_json(case when m.user_low_id = auth.uid() then m.user_high_id else m.user_low_id end),
    m.created_at,
    latest.content,
    m.created_at
  from public.matches m
  left join lateral (
    select message.content
    from public.messages message
    where message.match_id = m.id
    order by message.sent_at desc
    limit 1
  ) latest on true
  where m.status = 'active'
    and private.can_use_active_match(m.id)
    and (p_cursor_created_at is null or m.created_at < p_cursor_created_at)
  order by m.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 50);
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
  if p_type <> 'audio' then raise exception using errcode = '22023', message = 'audio_only_in_mvp'; end if;
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

create or replace function public.accept_call(p_call_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_result uuid;
begin
  update public.calls c
  set status = 'accepted'
  where c.id = p_call_id
    and c.callee_id = auth.uid()
    and c.status = 'ringing'
    and private.can_use_active_match(c.match_id)
  returning c.id into v_result;
  if v_result is null then raise exception using errcode = '42501', message = 'call_access_denied'; end if;
  return v_result;
end;
$$;

create or replace function public.reject_call(p_call_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_result uuid;
begin
  update public.calls c
  set status = 'rejected', ended_at = now()
  where c.id = p_call_id
    and c.callee_id = auth.uid()
    and c.status = 'ringing'
  returning c.id into v_result;
  if v_result is null then raise exception using errcode = '42501', message = 'call_access_denied'; end if;
  return v_result;
end;
$$;

create or replace function public.end_call(p_call_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_result uuid;
begin
  update public.calls c
  set status = 'ended', ended_at = now()
  where c.id = p_call_id
    and auth.uid() in (c.caller_id, c.callee_id)
    and c.status in ('ringing', 'accepted', 'connecting', 'connected')
  returning c.id into v_result;
  if v_result is null then raise exception using errcode = '42501', message = 'call_access_denied'; end if;
  return v_result;
end;
$$;

revoke execute on function public.get_public_profile(uuid) from public, anon;
revoke execute on function public.get_discovery_candidates(smallint, smallint, smallint, text[], text[], integer, timestamptz) from public, anon;
revoke execute on function public.list_active_matches(integer, timestamptz) from public, anon;
revoke execute on function public.accept_call(uuid) from public, anon;
revoke execute on function public.reject_call(uuid) from public, anon;
revoke execute on function public.end_call(uuid) from public, anon;
grant execute on function public.get_public_profile(uuid) to authenticated;
grant execute on function public.get_discovery_candidates(smallint, smallint, smallint, text[], text[], integer, timestamptz) to authenticated;
grant execute on function public.list_active_matches(integer, timestamptz) to authenticated;
grant execute on function public.accept_call(uuid) to authenticated;
grant execute on function public.reject_call(uuid) to authenticated;
grant execute on function public.end_call(uuid) to authenticated;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.calls;
