-- =============================================================================
-- HeartSync — Consolidated PostgreSQL / Supabase Schema
-- =============================================================================
-- Includes: extensions, custom enums, core tables & indexes, private helpers &
-- triggers, Row-Level Security (RLS) & least-privilege grants, private storage
-- bucket policies, realtime publications, public RPCs, AI quota system, and
-- development email auto-confirm helpers.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensions & Private Schema
-- -----------------------------------------------------------------------------
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Custom Enums
-- -----------------------------------------------------------------------------
create type public.swipe_action as enum ('like', 'pass');
create type public.match_status as enum ('active', 'unmatched');
create type public.call_type as enum ('audio', 'video');
create type public.call_status as enum (
  'ringing', 'accepted', 'rejected', 'missed', 'connecting', 'connected', 'ended', 'failed'
);

-- -----------------------------------------------------------------------------
-- 3. Tables & Indexes
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
  gender text not null check (char_length(btrim(gender)) between 1 and 40),
  bio text check (bio is null or char_length(bio) <= 500),
  occupation text check (occupation is null or char_length(occupation) <= 120),
  education text check (education is null or char_length(education) <= 160),
  public_location text check (public_location is null or char_length(public_location) <= 120),
  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public profile projection only. Never add email, DOB, precise coordinates, or auth tokens.';
comment on column public.profiles.public_location is 'Coarse user-approved label only; never precise coordinates or a full address.';

create table public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  date_of_birth date not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  location_consent boolean not null default false,
  location_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_private_adult check (date_of_birth <= (current_date - interval '18 years')::date),
  constraint profile_private_coordinates_pair check ((latitude is null) = (longitude is null)),
  constraint profile_private_latitude check (latitude is null or latitude between -90 and 90),
  constraint profile_private_longitude check (longitude is null or longitude between -180 and 180),
  constraint profile_private_location_consent check (latitude is null or location_consent)
);

comment on table public.profile_private is 'Owner-only DOB and precise location. Do not expose through a public view.';

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  sort_order smallint not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint profile_photos_sort_order_check check (sort_order between 0 and 5),
  constraint profile_photos_owner_path check (storage_path like profile_id::text || '/%'),
  constraint profile_photos_profile_order_unique unique (profile_id, sort_order) deferrable initially deferred
);

create unique index profile_photos_one_primary_idx on public.profile_photos(profile_id) where is_primary;
create index profile_photos_profile_id_idx on public.profile_photos(profile_id);

create table public.interests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null unique check (char_length(btrim(label)) between 1 and 60)
);

insert into public.interests (slug, label)
values
  ('books', 'Đọc sách'),
  ('coffee', 'Cà phê'),
  ('hiking', 'Đi bộ'),
  ('music', 'Âm nhạc'),
  ('photography', 'Nhiếp ảnh'),
  ('cooking', 'Nấu ăn'),
  ('travel', 'Du lịch'),
  ('movies', 'Phim ảnh'),
  ('fitness', 'Thể thao'),
  ('gaming', 'Trò chơi'),
  ('pets', 'Thú cưng'),
  ('art', 'Nghệ thuật'),
  ('technology', 'Công nghệ'),
  ('volunteering', 'Tình nguyện'),
  ('nature', 'Thiên nhiên')
on conflict (slug) do update set label = excluded.label;

create table public.profile_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete restrict,
  primary key (profile_id, interest_id)
);

create index profile_interests_interest_id_idx on public.profile_interests(interest_id);

create table public.profile_languages (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  language_code text not null check (language_code ~ '^[a-z]{2,3}(?:-[A-Z]{2})?$'),
  primary key (profile_id, language_code)
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  age_min smallint not null default 18 check (age_min between 18 and 120),
  age_max smallint not null default 99 check (age_max between 18 and 120),
  distance_km smallint default 50 check (distance_km between 1 and 500),
  preferred_genders text[] not null default '{}',
  preferred_languages text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint user_preferences_age_range check (age_min <= age_max),
  constraint user_preferences_gender_values check (array_position(preferred_genders, null) is null),
  constraint user_preferences_language_values check (array_position(preferred_languages, null) is null)
);

comment on column public.user_preferences.preferred_genders is 'Small multi-value preference set; array keeps one owner-controlled row and atomic updates.';
comment on column public.user_preferences.preferred_languages is 'Small language-code preference set; array avoids a separate mutable join table.';

create table public.saved_profiles (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, target_id),
  constraint saved_profiles_not_self check (owner_id <> target_id)
);

create index saved_profiles_target_id_idx on public.saved_profiles(target_id);

create table public.swipes (
  actor_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  action public.swipe_action not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (actor_id, target_id),
  constraint swipes_not_self check (actor_id <> target_id)
);

create index swipes_target_action_idx on public.swipes(target_id, action);
comment on table public.swipes is 'Current-state model: one mutable like/pass state per directed pair, not an event history.';

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references public.profiles(id) on delete cascade,
  user_high_id uuid not null references public.profiles(id) on delete cascade,
  status public.match_status not null default 'active',
  created_at timestamptz not null default now(),
  unmatched_at timestamptz,
  unmatched_by uuid references public.profiles(id) on delete set null,
  constraint matches_canonical_pair check (user_low_id < user_high_id),
  constraint matches_unmatch_state check (
    (status = 'active' and unmatched_at is null and unmatched_by is null)
    or (status = 'unmatched' and unmatched_at is not null and unmatched_by is not null)
  ),
  unique (user_low_id, user_high_id)
);

create index matches_user_high_id_idx on public.matches(user_high_id);
create index matches_active_low_idx on public.matches(user_low_id) where status = 'active';
create index matches_active_high_idx on public.matches(user_high_id) where status = 'active';

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  client_message_id uuid not null,
  content text not null check (char_length(btrim(content)) between 1 and 4000),
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  unique (sender_id, client_message_id)
);

create index messages_match_sent_idx on public.messages(match_id, sent_at desc);
create index messages_sender_id_idx on public.messages(sender_id);
create index messages_cursor_idx on public.messages(match_id, sent_at desc, id desc);
create index messages_unread_idx on public.messages(match_id, sender_id) where read_at is null;

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete restrict,
  callee_id uuid not null references public.profiles(id) on delete restrict,
  type public.call_type not null,
  status public.call_status not null default 'ringing',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  caller_heartbeat_at timestamptz,
  callee_heartbeat_at timestamptz,
  constraint calls_not_self check (caller_id <> callee_id),
  constraint calls_end_state check (
    (status in ('ended', 'rejected', 'missed', 'failed') and ended_at is not null)
    or (status not in ('ended', 'rejected', 'missed', 'failed') and ended_at is null)
  )
);

create index calls_match_started_idx on public.calls(match_id, started_at desc);
create index calls_caller_id_idx on public.calls(caller_id);
create index calls_callee_id_idx on public.calls(callee_id);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create index blocks_blocked_id_idx on public.blocks(blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('fake_profile', 'harassment', 'underage', 'spam', 'other')),
  details text check (details is null or char_length(details) <= 2000),
  created_at timestamptz not null default now(),
  constraint reports_not_self check (reporter_id <> reported_id)
);

create index reports_reporter_id_idx on public.reports(reporter_id);
create index reports_reported_id_idx on public.reports(reported_id);

create table private.call_media_cleanup (
  call_id uuid primary key,
  caller_id uuid not null,
  callee_id uuid not null,
  queued_at timestamptz not null default now()
);

create table public.ai_quota_buckets (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('profile_bio', 'icebreaker')),
  period_key text not null,
  used_count integer not null default 0 check (used_count between 0 and 2),
  reserved_count integer not null default 0 check (reserved_count between 0 and 2),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature, period_key),
  constraint ai_quota_buckets_period_key_check check (
    period_key = 'lifetime' or period_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  ),
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
    or (feature = 'icebreaker' and period_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and match_id is not null)
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

-- -----------------------------------------------------------------------------
-- 4. Private Helper Functions & Triggers
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger profile_private_set_updated_at before update on public.profile_private
for each row execute function private.set_updated_at();
create trigger preferences_set_updated_at before update on public.user_preferences
for each row execute function private.set_updated_at();
create trigger swipes_set_updated_at before update on public.swipes
for each row execute function private.set_updated_at();

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

create or replace function private.enqueue_call_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('ended', 'rejected', 'missed', 'failed') then
    insert into private.call_media_cleanup (call_id, caller_id, callee_id)
    values (new.id, new.caller_id, new.callee_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger enqueue_call_cleanup
after update of status on public.calls
for each row execute function private.enqueue_call_cleanup();

create or replace function private.end_unmatched_calls()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'unmatched' then
    update public.calls
    set status = 'ended', ended_at = now()
    where match_id = new.id
      and status in ('ringing', 'accepted', 'connecting', 'connected');
  end if;
  return new;
end;
$$;

create trigger end_unmatched_calls
after update of status on public.matches
for each row execute function private.end_unmatched_calls();

create or replace function private.ai_period_key(p_feature text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_feature = 'profile_bio' then
    return 'lifetime';
  end if;
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

revoke execute on function private.set_updated_at() from public, anon, authenticated;
revoke execute on function private.is_blocked_between(uuid, uuid) from public, anon;
revoke execute on function private.is_eligible_profile(uuid) from public, anon;
revoke execute on function private.can_view_profile(uuid) from public, anon;
revoke execute on function private.can_read_match_history(uuid) from public, anon;
revoke execute on function private.can_use_active_match(uuid) from public, anon;
revoke execute on function private.profile_public_json(uuid) from public, anon, authenticated;
revoke execute on function private.enqueue_call_cleanup() from public, anon, authenticated;
revoke execute on function private.end_unmatched_calls() from public, anon, authenticated;
revoke execute on function private.ai_period_key(text) from public, anon, authenticated;
revoke execute on function private.ai_quota_json(uuid, text, text) from public, anon, authenticated;
revoke execute on function private.ai_request_state(private.ai_generation_requests) from public, anon, authenticated;

grant execute on function private.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function private.is_eligible_profile(uuid) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;
grant execute on function private.can_read_match_history(uuid) to authenticated;
grant execute on function private.can_use_active_match(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Row Level Security (RLS) & Table Grants
-- -----------------------------------------------------------------------------
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
alter table public.ai_quota_buckets enable row level security;

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
  public.reports,
  public.ai_quota_buckets
from public, anon, authenticated;

revoke all on table private.call_media_cleanup from public, anon, authenticated;
revoke all on table private.ai_generation_requests from public, anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.profile_private to authenticated;
grant select, insert, update, delete on public.profile_photos to authenticated;
grant select on public.interests to authenticated;
grant select, insert, delete on public.profile_interests to authenticated;
grant select, insert, delete on public.profile_languages to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.saved_profiles to authenticated;
grant select on public.swipes to authenticated;
grant select on public.matches to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.calls to authenticated;
grant select, delete on public.blocks to authenticated;
grant select, insert on public.reports to authenticated;
grant select on public.ai_quota_buckets to authenticated;

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
create policy saved_profiles_update_own on public.saved_profiles for update to authenticated
using ((select auth.uid()) = owner_id)
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

create policy ai_quota_buckets_select_own on public.ai_quota_buckets for select to authenticated
using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- 6. Storage Bucket & Object Policies (profile-photos)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy profile_photo_objects_select_visible
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-photos'
  and exists (
    select 1 from public.profile_photos pp
    where pp.storage_path = name
      and (select private.can_view_profile(pp.profile_id))
  )
);

create policy profile_photo_objects_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy profile_photo_objects_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy profile_photo_objects_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- -----------------------------------------------------------------------------
-- 7. Public RPCs — Profile, Discovery, Matching & Safety
-- -----------------------------------------------------------------------------
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

create or replace function public.save_my_profile(
  p_display_name text,
  p_gender text,
  p_date_of_birth date,
  p_bio text default null,
  p_occupation text default null,
  p_education text default null,
  p_public_location text default null,
  p_interest_labels text[] default '{}',
  p_languages text[] default '{}',
  p_location_consent boolean default false,
  p_latitude numeric default null,
  p_longitude numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_interest_labels text[];
  v_languages text[];
  v_known_interest_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if char_length(btrim(coalesce(p_display_name, ''))) not between 2 and 80 then
    raise exception using errcode = '22023', message = 'invalid_display_name';
  end if;
  if p_gender not in ('man', 'woman', 'nonbinary', 'prefer_not_to_say') then
    raise exception using errcode = '22023', message = 'invalid_gender';
  end if;
  if p_date_of_birth is null or p_date_of_birth > (current_date - interval '18 years')::date then
    raise exception using errcode = '22023', message = 'adult_profile_required';
  end if;
  if p_location_consent and (p_latitude is null or p_longitude is null) then
    raise exception using errcode = '22023', message = 'coordinates_required';
  end if;
  if p_latitude is not null and not (p_latitude between -90 and 90) then
    raise exception using errcode = '22023', message = 'invalid_latitude';
  end if;
  if p_longitude is not null and not (p_longitude between -180 and 180) then
    raise exception using errcode = '22023', message = 'invalid_longitude';
  end if;

  select coalesce(array_agg(distinct btrim(value) order by btrim(value)), '{}')
  into v_interest_labels
  from unnest(coalesce(p_interest_labels, '{}')) value
  where btrim(value) <> '';

  select coalesce(array_agg(distinct lower(btrim(value)) order by lower(btrim(value))), '{}')
  into v_languages
  from unnest(coalesce(p_languages, '{}')) value
  where btrim(value) <> '';

  if exists (select 1 from unnest(v_languages) value where value !~ '^[a-z]{2,3}$') then
    raise exception using errcode = '22023', message = 'invalid_language';
  end if;

  select count(*) into v_known_interest_count
  from public.interests i
  where i.label = any(v_interest_labels);
  if v_known_interest_count <> cardinality(v_interest_labels) then
    raise exception using errcode = '22023', message = 'invalid_interest';
  end if;

  insert into public.profiles (
    id, display_name, gender, bio, occupation, education, public_location, profile_completed_at
  ) values (
    v_user_id,
    btrim(p_display_name),
    p_gender,
    nullif(btrim(coalesce(p_bio, '')), ''),
    nullif(btrim(coalesce(p_occupation, '')), ''),
    nullif(btrim(coalesce(p_education, '')), ''),
    nullif(btrim(coalesce(p_public_location, '')), ''),
    now()
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    gender = excluded.gender,
    bio = excluded.bio,
    occupation = excluded.occupation,
    education = excluded.education,
    public_location = excluded.public_location,
    profile_completed_at = excluded.profile_completed_at;

  insert into public.profile_private (
    user_id, date_of_birth, location_consent, latitude, longitude, location_updated_at
  ) values (
    v_user_id,
    p_date_of_birth,
    p_location_consent,
    case when p_location_consent then p_latitude else null end,
    case when p_location_consent then p_longitude else null end,
    case when p_location_consent then now() else null end
  )
  on conflict (user_id) do update set
    date_of_birth = excluded.date_of_birth,
    location_consent = excluded.location_consent,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    location_updated_at = excluded.location_updated_at;

  delete from public.profile_interests where profile_id = v_user_id;
  insert into public.profile_interests (profile_id, interest_id)
  select v_user_id, i.id
  from public.interests i
  where i.label = any(v_interest_labels);

  delete from public.profile_languages where profile_id = v_user_id;
  insert into public.profile_languages (profile_id, language_code)
  select v_user_id, value from unnest(v_languages) value;

  return private.profile_public_json(v_user_id);
end;
$$;

create or replace function public.save_my_private_location(
  p_location_consent boolean,
  p_latitude numeric default null,
  p_longitude numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if not exists (select 1 from public.profile_private where user_id = v_user_id) then
    raise exception using errcode = '22023', message = 'profile_required';
  end if;
  if p_location_consent and (p_latitude is null or p_longitude is null) then
    raise exception using errcode = '22023', message = 'coordinates_required';
  end if;
  if p_latitude is not null and not (p_latitude between -90 and 90) then
    raise exception using errcode = '22023', message = 'invalid_latitude';
  end if;
  if p_longitude is not null and not (p_longitude between -180 and 180) then
    raise exception using errcode = '22023', message = 'invalid_longitude';
  end if;

  update public.profile_private
  set location_consent = p_location_consent,
      latitude = case when p_location_consent then p_latitude else null end,
      longitude = case when p_location_consent then p_longitude else null end,
      location_updated_at = case when p_location_consent then now() else null end
  where user_id = v_user_id;
end;
$$;

create or replace function public.save_my_preferences(
  p_age_min smallint,
  p_age_max smallint,
  p_distance_km smallint default null,
  p_preferred_genders text[] default '{}',
  p_preferred_languages text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_distance smallint;
  v_genders text[];
  v_languages text[];
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if p_age_min is null or p_age_max is null or p_age_min < 18 or p_age_max > 120 or p_age_min > p_age_max then
    raise exception using errcode = '22023', message = 'invalid_age_filter';
  end if;
  if p_distance_km is not null and (p_distance_km < 1 or p_distance_km > 500) then
    raise exception using errcode = '22023', message = 'invalid_distance_filter';
  end if;

  select coalesce(array_agg(distinct value order by value), '{}') into v_genders
  from unnest(coalesce(p_preferred_genders, '{}')) value;
  if exists (select 1 from unnest(v_genders) value where value not in ('man', 'woman', 'nonbinary', 'prefer_not_to_say')) then
    raise exception using errcode = '22023', message = 'invalid_gender_filter';
  end if;

  select coalesce(array_agg(distinct lower(btrim(value)) order by lower(btrim(value))), '{}') into v_languages
  from unnest(coalesce(p_preferred_languages, '{}')) value
  where btrim(value) <> '';
  if exists (select 1 from unnest(v_languages) value where value !~ '^[a-z]{2,3}$') then
    raise exception using errcode = '22023', message = 'invalid_language_filter';
  end if;

  select case
    when p_distance_km is not null
      and pp.location_consent
      and pp.latitude is not null
      and pp.longitude is not null
    then p_distance_km
    else null
  end
  into v_distance
  from public.profile_private pp
  where pp.user_id = v_user_id;

  insert into public.user_preferences (
    user_id, age_min, age_max, distance_km, preferred_genders, preferred_languages
  ) values (
    v_user_id, p_age_min, p_age_max, v_distance, v_genders, v_languages
  )
  on conflict (user_id) do update set
    age_min = excluded.age_min,
    age_max = excluded.age_max,
    distance_km = excluded.distance_km,
    preferred_genders = excluded.preferred_genders,
    preferred_languages = excluded.preferred_languages;

  return jsonb_build_object(
    'ageMin', p_age_min,
    'ageMax', p_age_max,
    'distanceKm', v_distance,
    'preferredGenders', v_genders,
    'preferredLanguages', v_languages
  );
end;
$$;

create or replace function public.reorder_profile_photos(p_photo_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_owned_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  if cardinality(coalesce(p_photo_ids, '{}')) > 6 then
    raise exception using errcode = '22023', message = 'photo_limit_exceeded';
  end if;

  if cardinality(coalesce(p_photo_ids, '{}')) <> cardinality(
    array(select distinct value from unnest(coalesce(p_photo_ids, '{}')) value)
  ) then
    raise exception using errcode = '22023', message = 'duplicate_photo';
  end if;

  select count(*) into v_owned_count
  from public.profile_photos
  where profile_id = v_user_id;

  if v_owned_count <> cardinality(coalesce(p_photo_ids, '{}'))
    or exists (
      select 1
      from unnest(coalesce(p_photo_ids, '{}')) value
      where not exists (
        select 1
        from public.profile_photos photo
        where photo.id = value and photo.profile_id = v_user_id
      )
    ) then
    raise exception using errcode = '42501', message = 'photo_access_denied';
  end if;

  update public.profile_photos
  set is_primary = false
  where profile_id = v_user_id;

  update public.profile_photos photo
  set sort_order = ordering.position - 1
  from unnest(coalesce(p_photo_ids, '{}')) with ordinality as ordering(id, position)
  where photo.id = ordering.id and photo.profile_id = v_user_id;

  update public.profile_photos
  set is_primary = true
  where profile_id = v_user_id and id = p_photo_ids[1];

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', photo.id,
      'storagePath', photo.storage_path,
      'sortOrder', photo.sort_order,
      'isPrimary', photo.is_primary
    ) order by photo.sort_order)
    from public.profile_photos photo
    where photo.profile_id = v_user_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.set_primary_profile_photo(p_photo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if not exists (
    select 1 from public.profile_photos
    where id = p_photo_id and profile_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'photo_access_denied';
  end if;
  perform public.reorder_profile_photos(
    array[p_photo_id] || array(
      select photo.id
      from public.profile_photos photo
      where photo.profile_id = v_user_id and photo.id <> p_photo_id
      order by photo.sort_order
    )
  );
end;
$$;

create or replace function public.list_saved_profiles(
  p_limit integer default 20,
  p_cursor_created_at timestamptz default null
)
returns table(profile jsonb, saved_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  return query
  select private.profile_public_json(saved.target_id), saved.created_at
  from public.saved_profiles saved
  where saved.owner_id = v_user_id
    and private.can_view_profile(saved.target_id)
    and (p_cursor_created_at is null or saved.created_at < p_cursor_created_at)
  order by saved.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
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

-- -----------------------------------------------------------------------------
-- 8. Public RPCs — Messaging & Calling (Audio/Video + Heartbeat Leases)
-- -----------------------------------------------------------------------------
create or replace function public.send_chat_message(
  p_match_id uuid,
  p_client_message_id uuid,
  p_content text
)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare v public.messages;
begin
  if auth.uid() is null or not private.can_use_active_match(p_match_id) then
    raise exception using errcode = '42501', message = 'active_match_required';
  end if;
  if char_length(btrim(p_content)) not between 1 and 4000 then
    raise exception using errcode = '22023', message = 'invalid_message';
  end if;
  insert into public.messages(match_id, sender_id, client_message_id, content)
  values (p_match_id, auth.uid(), p_client_message_id, btrim(p_content))
  on conflict (sender_id, client_message_id) do nothing
  returning * into v;
  if v.id is null then
    select * into v from public.messages
    where sender_id = auth.uid() and client_message_id = p_client_message_id;
  end if;
  if v.match_id <> p_match_id or v.content <> btrim(p_content) then
    raise exception using errcode = '22023', message = 'message_identity_conflict';
  end if;
  return v;
end;
$$;

create or replace function public.mark_messages_read(p_match_id uuid, p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_read_match_history(p_match_id) then
    raise exception using errcode = '42501', message = 'match_access_denied';
  end if;
  if coalesce(array_length(p_ids, 1), 0) > 200 then
    raise exception using errcode = '22023', message = 'too_many_messages';
  end if;
  update public.messages
  set read_at = now()
  where match_id = p_match_id
    and id = any(p_ids)
    and sender_id <> auth.uid()
    and read_at is null;
end;
$$;

create or replace function public.chat_summaries()
returns table(
  match_id uuid,
  last_message_at timestamptz,
  unread_count bigint,
  last_read_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    max(msg.sent_at),
    count(msg.id) filter (where msg.sender_id <> auth.uid() and msg.read_at is null),
    max(msg.read_at) filter (where msg.sender_id = auth.uid())
  from public.matches m
  left join public.messages msg on msg.match_id = m.id
  where m.status = 'active'
    and private.can_use_active_match(m.id)
  group by m.id;
$$;

create or replace function public.list_chat_matches(p_cursor text default null)
returns table(
  id uuid,
  other_profile jsonb,
  created_at timestamptz,
  last_message_preview text,
  last_message_at timestamptz,
  unread_count bigint,
  cursor_created_at text
)
language sql
stable
security definer
set search_path = ''
as $$
  with summaries as (
    select
      m.id,
      private.profile_public_json(case when m.user_low_id = auth.uid() then m.user_high_id else m.user_low_id end) as other_profile,
      m.created_at,
      (select content from public.messages where match_id = m.id order by sent_at desc, id desc limit 1) as preview,
      coalesce((select max(sent_at) from public.messages where match_id = m.id), m.created_at) as activity,
      (select count(*) from public.messages where match_id = m.id and sender_id <> auth.uid() and read_at is null) as unread
    from public.matches m
    where m.status = 'active' and private.can_use_active_match(m.id)
  )
  select s.id, s.other_profile, s.created_at, s.preview, s.activity, s.unread, s.activity::text || '|' || s.id::text
  from summaries s
  where p_cursor is null
     or (s.activity, s.id) < (split_part(p_cursor, '|', 1)::timestamptz, split_part(p_cursor, '|', 2)::uuid)
  order by s.activity desc, s.id desc
  limit 30;
$$;

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
    raise exception using errcode = '42501', message = 'active_match_required';
  end if;

  if p_type is null
     or p_type not in ('audio'::public.call_type, 'video'::public.call_type) then
    raise exception using errcode = '22023', message = 'invalid_call_type';
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
    and (caller_id in (actor_id, peer_id) or callee_id in (actor_id, peer_id));

  update public.calls
  set status = 'ended', ended_at = now()
  where status in ('accepted', 'connecting', 'connected')
    and (caller_id in (actor_id, peer_id) or callee_id in (actor_id, peer_id))
    and (
      coalesce(caller_heartbeat_at, started_at) < now() - interval '90 seconds'
      or coalesce(callee_heartbeat_at, started_at) < now() - interval '90 seconds'
    );

  if exists (
    select 1 from public.calls
    where status in ('ringing', 'accepted', 'connecting', 'connected')
      and (caller_id in (actor_id, peer_id) or callee_id in (actor_id, peer_id))
  ) then
    raise exception using errcode = '23505', message = 'participant_busy';
  end if;

  insert into public.calls (
    match_id, caller_id, callee_id, type, caller_heartbeat_at
  ) values (
    p_match_id, actor_id, peer_id, p_type, now()
  ) returning id into call_id;

  return call_id;
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

create or replace function public.reject_call(p_call_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v uuid;
begin
  update public.calls
  set status = 'rejected', ended_at = now()
  where id = p_call_id and callee_id = auth.uid() and status = 'ringing'
  returning id into v;
  if v is null then
    select id into v from public.calls
    where id = p_call_id and callee_id = auth.uid() and status = 'rejected';
  end if;
  if v is null then
    raise exception using errcode = '42501', message = 'call_access_denied';
  end if;
  return v;
end;
$$;

create or replace function public.end_call(p_call_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.calls where id = p_call_id and auth.uid() in (caller_id, callee_id)
  ) then
    raise exception using errcode = '42501', message = 'call_access_denied';
  end if;
  update public.calls
  set status = 'ended', ended_at = now()
  where id = p_call_id and status in ('ringing', 'accepted', 'connecting', 'connected');
  return p_call_id;
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

create or replace function public.ack_call_cleanup(p_call_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.call_media_cleanup where call_id = p_call_id;
$$;

-- -----------------------------------------------------------------------------
-- 9. Public RPCs — Gemini AI Quota & Context
-- -----------------------------------------------------------------------------
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

  select * into v_bucket
  from public.ai_quota_buckets
  where user_id = v_user_id and feature = p_feature and period_key = v_period_key
  for update;

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

-- -----------------------------------------------------------------------------
-- 10. RPC Execution Permissions
-- -----------------------------------------------------------------------------
revoke all on function public.get_public_profile(uuid) from public, anon;
revoke all on function public.save_my_profile(text, text, date, text, text, text, text, text[], text[], boolean, numeric, numeric) from public, anon;
revoke all on function public.save_my_private_location(boolean, numeric, numeric) from public, anon;
revoke all on function public.save_my_preferences(smallint, smallint, smallint, text[], text[]) from public, anon;
revoke all on function public.reorder_profile_photos(uuid[]) from public, anon;
revoke all on function public.set_primary_profile_photo(uuid) from public, anon;
revoke all on function public.list_saved_profiles(integer, timestamptz) from public, anon;
revoke all on function public.get_discovery_candidates(smallint, smallint, smallint, text[], text[], integer, timestamptz) from public, anon;
revoke all on function public.record_swipe(uuid, public.swipe_action) from public, anon;
revoke all on function public.list_active_matches(integer, timestamptz) from public, anon;
revoke all on function public.unmatch(uuid) from public, anon;
revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.send_chat_message(uuid, uuid, text) from public, anon;
revoke all on function public.mark_messages_read(uuid, uuid[]) from public, anon;
revoke all on function public.chat_summaries() from public, anon;
revoke all on function public.list_chat_matches(text) from public, anon;
revoke all on function public.start_call(uuid, public.call_type) from public, anon;
revoke all on function public.accept_call(uuid) from public, anon;
revoke all on function public.reject_call(uuid) from public, anon;
revoke all on function public.end_call(uuid) from public, anon;
revoke all on function public.call_heartbeat(uuid) from public, anon;
revoke all on function public.reconcile_calls() from public, anon;
revoke all on function public.pending_call_cleanup() from public, anon, authenticated;
revoke all on function public.ack_call_cleanup(uuid) from public, anon, authenticated;
revoke all on function public.reserve_ai_request(text, uuid, uuid) from public, anon;
revoke all on function public.finalize_ai_request(uuid, jsonb) from public, anon;
revoke all on function public.fail_ai_request(uuid, text) from public, anon;
revoke all on function public.get_ai_quotas() from public, anon;
revoke all on function public.ai_icebreaker_context(uuid) from public, anon;

grant execute on function public.get_public_profile(uuid) to authenticated;
grant execute on function public.save_my_profile(text, text, date, text, text, text, text, text[], text[], boolean, numeric, numeric) to authenticated;
grant execute on function public.save_my_private_location(boolean, numeric, numeric) to authenticated;
grant execute on function public.save_my_preferences(smallint, smallint, smallint, text[], text[]) to authenticated;
grant execute on function public.reorder_profile_photos(uuid[]) to authenticated;
grant execute on function public.set_primary_profile_photo(uuid) to authenticated;
grant execute on function public.list_saved_profiles(integer, timestamptz) to authenticated;
grant execute on function public.get_discovery_candidates(smallint, smallint, smallint, text[], text[], integer, timestamptz) to authenticated;
grant execute on function public.record_swipe(uuid, public.swipe_action) to authenticated;
grant execute on function public.list_active_matches(integer, timestamptz) to authenticated;
grant execute on function public.unmatch(uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.send_chat_message(uuid, uuid, text) to authenticated;
grant execute on function public.mark_messages_read(uuid, uuid[]) to authenticated;
grant execute on function public.chat_summaries() to authenticated;
grant execute on function public.list_chat_matches(text) to authenticated;
grant execute on function public.start_call(uuid, public.call_type) to authenticated;
grant execute on function public.accept_call(uuid) to authenticated;
grant execute on function public.reject_call(uuid) to authenticated;
grant execute on function public.end_call(uuid) to authenticated;
grant execute on function public.call_heartbeat(uuid) to authenticated;
grant execute on function public.reconcile_calls() to authenticated;
grant execute on function public.pending_call_cleanup() to service_role;
grant execute on function public.ack_call_cleanup(uuid) to service_role;
grant execute on function public.reserve_ai_request(text, uuid, uuid) to authenticated;
grant execute on function public.finalize_ai_request(uuid, jsonb) to authenticated;
grant execute on function public.fail_ai_request(uuid, text) to authenticated;
grant execute on function public.get_ai_quotas() to authenticated;
grant execute on function public.ai_icebreaker_context(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 11. Dev / Demo Auth Auto-Confirm Helpers (Supabase Free Tier SMTP Bypass)
-- -----------------------------------------------------------------------------
create or replace function public.handle_auto_confirm_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := pg_catalog.now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_auto_confirm on auth.users;
create trigger on_auth_user_auto_confirm
before insert on auth.users
for each row
execute function public.handle_auto_confirm_user();

update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, pg_catalog.now())
where email_confirmed_at is null;

create or replace function public.confirm_user_email_for_dev(target_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := lower(btrim(coalesce(target_email, '')));
  updated_count integer := 0;
begin
  if normalized = '' then
    return false;
  end if;

  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, pg_catalog.now()),
      updated_at = pg_catalog.now()
  where lower(email) = normalized;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

revoke all on function public.handle_auto_confirm_user() from public, anon, authenticated;
grant execute on function public.confirm_user_email_for_dev(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 12. Realtime Publication & PostgREST Schema Reload
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'calls'
  ) then
    alter publication supabase_realtime add table public.calls;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;
end;
$$;

notify pgrst, 'reload schema';

