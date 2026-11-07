-- Enable video calls while retaining the participant heartbeat lease introduced
-- by 20261105120000_call_liveness.sql. This migration intentionally replaces
-- the complete function so a later migration cannot restore the legacy
-- audio-only implementation or drop stale-call cleanup behavior.
create or replace function public.start_call(
  p_match_id uuid,
  p_type public.call_type
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  peer_id uuid;
  call_id uuid;
  low_id uuid;
  high_id uuid;
begin
  if actor_id is null or not private.can_use_active_match(p_match_id) then
    raise exception using
      errcode = '42501',
      message = 'active_match_required';
  end if;

  if p_type is null
     or p_type not in ('audio'::public.call_type, 'video'::public.call_type) then
    raise exception using
      errcode = '22023',
      message = 'invalid_call_type';
  end if;

  select user_low_id, user_high_id
  into low_id, high_id
  from public.matches
  where id = p_match_id;

  perform pg_advisory_xact_lock(hashtextextended(low_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(high_id::text, 0));

  peer_id := case when actor_id = low_id then high_id else low_id end;

  update public.calls
  set status = 'missed', ended_at = now()
  where status = 'ringing'
    and started_at < now() - interval '45 seconds'
    and (
      caller_id in (actor_id, peer_id)
      or callee_id in (actor_id, peer_id)
    );

  update public.calls
  set status = 'ended', ended_at = now()
  where status in ('accepted', 'connecting', 'connected')
    and (
      caller_id in (actor_id, peer_id)
      or callee_id in (actor_id, peer_id)
    )
    and (
      coalesce(caller_heartbeat_at, started_at) < now() - interval '90 seconds'
      or coalesce(callee_heartbeat_at, started_at) < now() - interval '90 seconds'
    );

  if exists (
    select 1
    from public.calls
    where status in ('ringing', 'accepted', 'connecting', 'connected')
      and (
        caller_id in (actor_id, peer_id)
        or callee_id in (actor_id, peer_id)
      )
  ) then
    raise exception using
      errcode = '23505',
      message = 'participant_busy';
  end if;

  insert into public.calls (
    match_id,
    caller_id,
    callee_id,
    type,
    caller_heartbeat_at
  )
  values (
    p_match_id,
    actor_id,
    peer_id,
    p_type,
    now()
  )
  returning id into call_id;

  return call_id;
end;
$$;

revoke execute on function public.start_call(uuid, public.call_type)
from public, anon;

grant execute on function public.start_call(uuid, public.call_type)
to authenticated;
