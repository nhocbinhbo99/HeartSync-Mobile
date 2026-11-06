-- Forward-only call liveness lease. Do not amend migrations already applied to cloud.
alter table public.calls
  add column if not exists caller_heartbeat_at timestamptz,
  add column if not exists callee_heartbeat_at timestamptz;

-- Release abandoned sessions from older clients while preserving recently accepted calls.
update public.calls
set status = 'ended', ended_at = now()
where status in ('accepted', 'connecting', 'connected')
  and started_at < now() - interval '90 seconds';

update public.calls
set caller_heartbeat_at = coalesce(caller_heartbeat_at, now()),
    callee_heartbeat_at = coalesce(callee_heartbeat_at, now())
where status in ('accepted', 'connecting', 'connected');

create or replace function public.start_call(p_match_id uuid, p_type public.call_type)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  a uuid := auth.uid();
  b uuid;
  c uuid;
  lo uuid;
  hi uuid;
begin
  if a is null or not private.can_use_active_match(p_match_id) then
    raise exception using errcode = '42501', message = 'active_match_required';
  end if;
  if p_type <> 'audio' then
    raise exception using errcode = '22023', message = 'audio_only_in_mvp';
  end if;

  select user_low_id, user_high_id into lo, hi
  from public.matches where id = p_match_id;
  perform pg_advisory_xact_lock(hashtextextended(lo::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(hi::text, 0));
  b := case when a = lo then hi else lo end;

  update public.calls
  set status = 'missed', ended_at = now()
  where status = 'ringing'
    and started_at < now() - interval '45 seconds'
    and (caller_id in (a, b) or callee_id in (a, b));

  update public.calls
  set status = 'ended', ended_at = now()
  where status in ('accepted', 'connecting', 'connected')
    and (caller_id in (a, b) or callee_id in (a, b))
    and (
      coalesce(caller_heartbeat_at, started_at) < now() - interval '90 seconds'
      or coalesce(callee_heartbeat_at, started_at) < now() - interval '90 seconds'
    );

  if exists (
    select 1 from public.calls
    where status in ('ringing', 'accepted', 'connecting', 'connected')
      and (caller_id in (a, b) or callee_id in (a, b))
  ) then
    raise exception using errcode = '23505', message = 'participant_busy';
  end if;

  insert into public.calls (
    match_id, caller_id, callee_id, type, caller_heartbeat_at
  ) values (
    p_match_id, a, b, p_type, now()
  ) returning id into c;
  return c;
end;
$$;

create or replace function public.accept_call(p_call_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v uuid;
begin
  update public.calls c
  set status = 'accepted',
      caller_heartbeat_at = now(),
      callee_heartbeat_at = now()
  where c.id = p_call_id
    and c.callee_id = auth.uid()
    and c.status = 'ringing'
    and c.started_at > now() - interval '45 seconds'
    and private.can_use_active_match(c.match_id)
  returning c.id into v;

  if v is null then
    select id into v from public.calls c
    where c.id = p_call_id
      and c.callee_id = auth.uid()
      and c.status = 'accepted'
      and private.can_use_active_match(c.match_id);
  end if;
  if v is null then
    raise exception using errcode = '42501', message = 'call_access_denied';
  end if;
  return v;
end;
$$;

create or replace function public.call_heartbeat(p_call_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  v uuid;
begin
  if actor is null then
    raise exception using errcode = '42501', message = 'call_access_denied';
  end if;

  update public.calls c
  set caller_heartbeat_at = case when c.caller_id = actor then now() else c.caller_heartbeat_at end,
      callee_heartbeat_at = case when c.callee_id = actor then now() else c.callee_heartbeat_at end
  where c.id = p_call_id
    and actor in (c.caller_id, c.callee_id)
    and c.status in ('accepted', 'connecting', 'connected')
    and private.can_use_active_match(c.match_id)
    and coalesce(c.caller_heartbeat_at, c.started_at) >= now() - interval '90 seconds'
    and coalesce(c.callee_heartbeat_at, c.started_at) >= now() - interval '90 seconds'
  returning c.id into v;

  if v is null then
    raise exception using errcode = '42501', message = 'call_inactive';
  end if;
  return v;
end;
$$;

create or replace function public.reconcile_calls()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.calls c
  set status = case
      when c.status = 'ringing' then 'missed'::public.call_status
      else 'ended'::public.call_status
    end,
    ended_at = now()
  where auth.uid() in (c.caller_id, c.callee_id)
    and c.status in ('ringing', 'accepted', 'connecting', 'connected')
    and (
      (c.status = 'ringing' and c.started_at < now() - interval '45 seconds')
      or (
        c.status in ('accepted', 'connecting', 'connected')
        and (
          coalesce(c.caller_heartbeat_at, c.started_at) < now() - interval '90 seconds'
          or coalesce(c.callee_heartbeat_at, c.started_at) < now() - interval '90 seconds'
        )
      )
      or not private.can_use_active_match(c.match_id)
    );
end;
$$;

create or replace function public.pending_call_cleanup()
returns setof private.call_media_cleanup
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.calls
  set status = 'missed', ended_at = now()
  where status = 'ringing'
    and started_at < now() - interval '45 seconds';

  update public.calls
  set status = 'ended', ended_at = now()
  where status in ('accepted', 'connecting', 'connected')
    and (
      coalesce(caller_heartbeat_at, started_at) < now() - interval '90 seconds'
      or coalesce(callee_heartbeat_at, started_at) < now() - interval '90 seconds'
    );

  return query
  select * from private.call_media_cleanup order by queued_at limit 100;
end;
$$;

revoke all on function public.call_heartbeat(uuid) from public, anon;
grant execute on function public.call_heartbeat(uuid) to authenticated;

