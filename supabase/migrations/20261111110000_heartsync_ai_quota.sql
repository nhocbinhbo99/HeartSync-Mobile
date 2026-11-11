-- Gemini AI quota: user-scoped, transaction-safe, and intentionally independent
-- from any future Pro/billing design. Do not apply remotely without review.

create table public.ai_quota_buckets (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('profile_bio', 'icebreaker')),
  period_key text not null check (period_key = 'lifetime' or period_key ~ '^\\d{4}-\\d{2}-\\d{2}$'),
  used_count integer not null default 0 check (used_count between 0 and 2),
  reserved_count integer not null default 0 check (reserved_count between 0 and 2),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature, period_key),
  constraint ai_quota_period_matches_feature check (
    (feature = 'profile_bio' and period_key = 'lifetime')
    or (feature = 'icebreaker' and period_key <> 'lifetime')
  ),
  constraint ai_quota_total_at_most_limit check (used_count + reserved_count <= 2)
);

comment on table public.ai_quota_buckets is
  'Server-maintained successful AI generation quota. Clients may read only their own rows; they never mutate counters.';

create table private.ai_generation_requests (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('profile_bio', 'icebreaker')),
  period_key text not null,
  match_id uuid references public.matches(id) on delete set null,
  status text not null check (status in ('reserved', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  result_json jsonb,
  error_code text,
  constraint ai_generation_request_shape check (
    (feature = 'profile_bio' and period_key = 'lifetime' and match_id is null)
    or (feature = 'icebreaker' and period_key ~ '^\\d{4}-\\d{2}-\\d{2}$' and match_id is not null)
  ),
  constraint ai_generation_request_state check (
    (status = 'reserved' and completed_at is null and result_json is null and error_code is null)
    or (status = 'completed' and completed_at is not null and result_json is not null and error_code is null)
    or (status = 'failed' and completed_at is not null and result_json is null and error_code is not null)
  )
);

create index ai_generation_requests_reclaim_idx
  on private.ai_generation_requests (user_id, feature, period_key, expires_at)
  where status = 'reserved';

comment on table private.ai_generation_requests is
  'Short-lived idempotency/audit data. It never stores prompts, profile input, JWTs, emails, or API keys.';

alter table public.ai_quota_buckets enable row level security;
revoke all on table public.ai_quota_buckets from public, anon, authenticated;
grant select on table public.ai_quota_buckets to authenticated;
create policy ai_quota_buckets_select_own on public.ai_quota_buckets
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on table private.ai_generation_requests from public, anon, authenticated;

create or replace function private.ai_period_key(p_feature text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_feature = 'profile_bio' then return 'lifetime'; end if;
  if p_feature = 'icebreaker' then
    return to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD');
  end if;
  raise exception using errcode = '22023', message = 'invalid_ai_feature';
end;
$$;

create or replace function private.ai_quota_json(
  p_user_id uuid,
  p_feature text,
  p_period_key text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_used integer := 0;
  v_reserved integer := 0;
  v_reset_at text := null;
begin
  select b.used_count, b.reserved_count
    into v_used, v_reserved
  from public.ai_quota_buckets b
  where b.user_id = p_user_id and b.feature = p_feature and b.period_key = p_period_key;

  v_used := coalesce(v_used, 0);
  v_reserved := coalesce(v_reserved, 0);
  if p_feature = 'icebreaker' then
    v_reset_at := to_char((p_period_key::date + 1)::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS') || '+07:00';
  end if;
  return jsonb_build_object(
    'limit', 2,
    'used', v_used,
    'remaining', greatest(0, 2 - v_used - v_reserved),
    'reset_at', v_reset_at
  );
end;
$$;

create or replace function private.ai_request_state(p_request private.ai_generation_requests)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_request.status = 'completed' then
    return jsonb_build_object(
      'state', 'completed',
      'result', p_request.result_json,
      'quota', private.ai_quota_json(p_request.user_id, p_request.feature, p_request.period_key)
    );
  end if;
  if p_request.status = 'reserved' then
    return jsonb_build_object(
      'state', 'in_progress',
      'quota', private.ai_quota_json(p_request.user_id, p_request.feature, p_request.period_key)
    );
  end if;
  return jsonb_build_object(
    'state', 'failed',
    'error_code', p_request.error_code,
    'quota', private.ai_quota_json(p_request.user_id, p_request.feature, p_request.period_key)
  );
end;
$$;

create or replace function public.reserve_ai_request(
  p_feature text,
  p_request_id uuid,
  p_match_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_period_key text;
  v_existing private.ai_generation_requests;
  v_reserved_expired integer := 0;
  v_bucket public.ai_quota_buckets;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'unauthenticated';
  end if;
  v_period_key := private.ai_period_key(p_feature);
  if (p_feature = 'profile_bio' and p_match_id is not null)
    or (p_feature = 'icebreaker' and (p_match_id is null or not private.can_use_active_match(p_match_id))) then
    raise exception using errcode = '42501', message = 'match_not_allowed';
  end if;

  -- A completed retry must return its cached response without reserving or calling Gemini again.
  select * into v_existing
  from private.ai_generation_requests
  where request_id = p_request_id;
  if found then
    if v_existing.user_id <> v_user_id
       or v_existing.feature <> p_feature
       or coalesce(v_existing.match_id, '00000000-0000-0000-0000-000000000000'::uuid)
          <> coalesce(p_match_id, '00000000-0000-0000-0000-000000000000'::uuid) then
      raise exception using errcode = '22023', message = 'request_identity_conflict';
    end if;
    return private.ai_request_state(v_existing);
  end if;

  insert into public.ai_quota_buckets (user_id, feature, period_key)
  values (v_user_id, p_feature, v_period_key)
  on conflict (user_id, feature, period_key) do nothing;

  -- This row lock serializes distinct request IDs for the same user/feature/period.
  select * into v_bucket
  from public.ai_quota_buckets
  where user_id = v_user_id and feature = p_feature and period_key = v_period_key
  for update;

  -- Reclaim abandoned Function executions before calculating availability. Network calls never hold this lock.
  with expired as (
    update private.ai_generation_requests
    set status = 'failed', completed_at = now(), error_code = 'REQUEST_EXPIRED'
    where user_id = v_user_id
      and feature = p_feature
      and period_key = v_period_key
      and status = 'reserved'
      and expires_at < now()
    returning request_id
  ) select count(*)::integer into v_reserved_expired from expired;
  if v_reserved_expired > 0 then
    update public.ai_quota_buckets
    set reserved_count = greatest(0, reserved_count - v_reserved_expired), updated_at = now()
    where user_id = v_user_id and feature = p_feature and period_key = v_period_key;
    select * into v_bucket
    from public.ai_quota_buckets
    where user_id = v_user_id and feature = p_feature and period_key = v_period_key;
  end if;

  -- A same-ID contender may have committed while this call waited on the bucket lock.
  select * into v_existing
  from private.ai_generation_requests
  where request_id = p_request_id
  for update;
  if found then
    if v_existing.user_id <> v_user_id
       or v_existing.feature <> p_feature
       or coalesce(v_existing.match_id, '00000000-0000-0000-0000-000000000000'::uuid)
          <> coalesce(p_match_id, '00000000-0000-0000-0000-000000000000'::uuid) then
      raise exception using errcode = '22023', message = 'request_identity_conflict';
    end if;
    return private.ai_request_state(v_existing);
  end if;

  if v_bucket.used_count + v_bucket.reserved_count >= 2 then
    return jsonb_build_object(
      'state', 'quota_exhausted',
      'quota', private.ai_quota_json(v_user_id, p_feature, v_period_key)
    );
  end if;

  insert into private.ai_generation_requests (
    request_id, user_id, feature, period_key, match_id, status, expires_at
  ) values (
    p_request_id, v_user_id, p_feature, v_period_key, p_match_id, 'reserved', now() + interval '2 minutes'
  );
  update public.ai_quota_buckets
  set reserved_count = reserved_count + 1, updated_at = now()
  where user_id = v_user_id and feature = p_feature and period_key = v_period_key;

  -- Output caches are deliberately short-lived and only pruned opportunistically by an authenticated request.
  delete from private.ai_generation_requests
  where user_id = v_user_id
    and status in ('completed', 'failed')
    and completed_at < now() - interval '24 hours';

  return jsonb_build_object(
    'state', 'reserved',
    'quota', private.ai_quota_json(v_user_id, p_feature, v_period_key)
  );
end;
$$;

create or replace function public.finalize_ai_request(
  p_request_id uuid,
  p_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request private.ai_generation_requests;
  v_bucket public.ai_quota_buckets;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'unauthenticated'; end if;
  if p_result is null or jsonb_typeof(p_result) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_ai_result';
  end if;
  select * into v_request from private.ai_generation_requests where request_id = p_request_id;
  if not found or v_request.user_id <> v_user_id then
    raise exception using errcode = '42501', message = 'request_not_allowed';
  end if;
  select * into v_bucket from public.ai_quota_buckets
  where user_id = v_user_id and feature = v_request.feature and period_key = v_request.period_key
  for update;
  select * into v_request from private.ai_generation_requests where request_id = p_request_id for update;
  if v_request.status = 'completed' then return private.ai_request_state(v_request); end if;
  if v_request.status = 'failed' then return private.ai_request_state(v_request); end if;
  if v_request.feature = 'icebreaker'
     and (v_request.match_id is null or not private.can_use_active_match(v_request.match_id)) then
    raise exception using errcode = '42501', message = 'match_not_allowed';
  end if;
  if v_request.expires_at < now() then
    update private.ai_generation_requests
    set status = 'failed', completed_at = now(), error_code = 'REQUEST_EXPIRED'
    where request_id = p_request_id;
    update public.ai_quota_buckets
    set reserved_count = greatest(0, reserved_count - 1), updated_at = now()
    where user_id = v_user_id and feature = v_request.feature and period_key = v_request.period_key;
    select * into v_request from private.ai_generation_requests where request_id = p_request_id;
    return private.ai_request_state(v_request);
  end if;
  update private.ai_generation_requests
  set status = 'completed', completed_at = now(), result_json = p_result
  where request_id = p_request_id;
  update public.ai_quota_buckets
  set used_count = used_count + 1, reserved_count = reserved_count - 1, updated_at = now()
  where user_id = v_user_id and feature = v_request.feature and period_key = v_request.period_key;
  select * into v_request from private.ai_generation_requests where request_id = p_request_id;
  return private.ai_request_state(v_request);
end;
$$;

create or replace function public.fail_ai_request(
  p_request_id uuid,
  p_error_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request private.ai_generation_requests;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'unauthenticated'; end if;
  if p_error_code not in ('GEMINI_RATE_LIMITED', 'AI_TEMPORARILY_UNAVAILABLE', 'AI_OUTPUT_INVALID', 'MATCH_NOT_ALLOWED') then
    raise exception using errcode = '22023', message = 'invalid_ai_error';
  end if;
  select * into v_request from private.ai_generation_requests where request_id = p_request_id;
  if not found or v_request.user_id <> v_user_id then
    raise exception using errcode = '42501', message = 'request_not_allowed';
  end if;
  perform 1 from public.ai_quota_buckets
  where user_id = v_user_id and feature = v_request.feature and period_key = v_request.period_key
  for update;
  select * into v_request from private.ai_generation_requests where request_id = p_request_id for update;
  if v_request.status = 'reserved' then
    update private.ai_generation_requests
    set status = 'failed', completed_at = now(), error_code = p_error_code
    where request_id = p_request_id;
    update public.ai_quota_buckets
    set reserved_count = greatest(0, reserved_count - 1), updated_at = now()
    where user_id = v_user_id and feature = v_request.feature and period_key = v_request.period_key;
    select * into v_request from private.ai_generation_requests where request_id = p_request_id;
  end if;
  return private.ai_request_state(v_request);
end;
$$;

create or replace function public.get_ai_quotas()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'unauthenticated'; end if;
  return jsonb_build_object(
    'profile_bio', private.ai_quota_json(v_user_id, 'profile_bio', 'lifetime'),
    'icebreaker', private.ai_quota_json(v_user_id, 'icebreaker', private.ai_period_key('icebreaker'))
  );
end;
$$;

create or replace function public.ai_icebreaker_context(p_match_id uuid)
returns table(self_interests text[], partner_interests text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_partner_id uuid;
begin
  if v_actor_id is null or not private.can_use_active_match(p_match_id) then
    raise exception using errcode = '42501', message = 'match_not_allowed';
  end if;
  select case when m.user_low_id = v_actor_id then m.user_high_id else m.user_low_id end
  into v_partner_id
  from public.matches m where m.id = p_match_id;
  return query
  select
    coalesce(array(
      select i.label from public.profile_interests pi
      join public.interests i on i.id = pi.interest_id
      where pi.profile_id = v_actor_id order by i.label
    ), '{}'::text[]),
    coalesce(array(
      select i.label from public.profile_interests pi
      join public.interests i on i.id = pi.interest_id
      where pi.profile_id = v_partner_id order by i.label
    ), '{}'::text[]);
end;
$$;

revoke all on function private.ai_period_key(text), private.ai_quota_json(uuid, text, text), private.ai_request_state(private.ai_generation_requests) from public, anon, authenticated;
revoke all on function public.reserve_ai_request(text, uuid, uuid), public.finalize_ai_request(uuid, jsonb), public.fail_ai_request(uuid, text), public.get_ai_quotas(), public.ai_icebreaker_context(uuid) from public, anon;
grant execute on function public.reserve_ai_request(text, uuid, uuid), public.finalize_ai_request(uuid, jsonb), public.fail_ai_request(uuid, text), public.get_ai_quotas(), public.ai_icebreaker_context(uuid) to authenticated;

-- Make newly created RPCs immediately visible to PostgREST after this migration.
notify pgrst, 'reload schema';
