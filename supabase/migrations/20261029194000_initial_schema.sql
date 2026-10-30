-- HeartSync BASE schema. Prepared locally; not applied to any remote project.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create type public.swipe_action as enum ('like', 'pass');
create type public.match_status as enum ('active', 'unmatched');
create type public.call_type as enum ('audio', 'video');
create type public.call_status as enum (
  'ringing', 'accepted', 'rejected', 'missed', 'connecting', 'connected', 'ended', 'failed'
);

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
  sort_order smallint not null default 0 check (sort_order between 0 and 8),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint profile_photos_owner_path check (storage_path like profile_id::text || '/%'),
  unique (profile_id, sort_order)
);
create unique index profile_photos_one_primary_idx on public.profile_photos(profile_id) where is_primary;
create index profile_photos_profile_id_idx on public.profile_photos(profile_id);

create table public.interests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null unique check (char_length(btrim(label)) between 1 and 60)
);

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
  distance_km smallint not null default 50 check (distance_km between 1 and 500),
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

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete restrict,
  callee_id uuid not null references public.profiles(id) on delete restrict,
  type public.call_type not null,
  status public.call_status not null default 'ringing',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
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

create or replace function private.set_updated_at()
returns trigger
language plpgsql
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

revoke execute on function private.set_updated_at() from public, anon, authenticated;
