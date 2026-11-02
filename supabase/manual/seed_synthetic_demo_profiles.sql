-- Manual cloud seed for the three dedicated HeartSync MVP test accounts.
--
-- Prerequisite: create and Auto Confirm these synthetic Auth users in the
-- Supabase dashboard. They are generic test identifiers; never use Invite or
-- password-reset flows with them because no email delivery is part of this seed.
--   test1@gmail.com
--   test2@gmail.com
--   test3@gmail.com
--
-- This is intentionally not a migration and is not enabled for `supabase db reset`.
-- It contains no password, token, real person, real email, photo, precise location,
-- or production data. It is safe to re-run for exactly those three synthetic users.

do $$
declare
  expected_email_count integer := 3;
  found_email_count integer;
begin
  select count(*) into found_email_count
  from auth.users
  where email in ('test1@gmail.com', 'test2@gmail.com', 'test3@gmail.com')
    and email_confirmed_at is not null;

  if found_email_count <> expected_email_count then
    raise exception
      'Create and Auto Confirm the three HeartSync synthetic Auth users before running this seed (found %, expected %).',
      found_email_count,
      expected_email_count;
  end if;
end;
$$;

insert into public.interests (slug, label)
values
  ('books', 'Đọc sách'),
  ('coffee', 'Cà phê'),
  ('hiking', 'Đi bộ'),
  ('music', 'Âm nhạc'),
  ('photography', 'Nhiếp ảnh')
on conflict (slug) do nothing;

with demo_profiles(email, display_name, gender, bio, occupation, education, public_location) as (
  values
    ('test1@gmail.com', 'An Bình', 'man', 'Thích sách, cà phê và những cuộc trò chuyện tử tế.', 'Thiết kế sản phẩm', 'Đại học', 'Quận 1, TP. Hồ Chí Minh'),
    ('test2@gmail.com', 'Bảo Chi', 'woman', 'Yêu âm nhạc, ảnh film và chuyến đi cuối tuần.', 'Truyền thông', 'Đại học', 'Quận 3, TP. Hồ Chí Minh'),
    ('test3@gmail.com', 'Cẩm Dương', 'nonbinary', 'Hồ sơ synthetic để kiểm thử quyền riêng tư và bộ lọc.', 'Kiểm thử phần mềm', 'Cao đẳng', 'Thủ Đức, TP. Hồ Chí Minh')
)
insert into public.profiles (
  id,
  display_name,
  gender,
  bio,
  occupation,
  education,
  public_location,
  profile_completed_at
)
select
  u.id,
  p.display_name,
  p.gender,
  p.bio,
  p.occupation,
  p.education,
  p.public_location,
  now()
from demo_profiles p
join auth.users u on u.email = p.email
on conflict (id) do update
set
  display_name = excluded.display_name,
  gender = excluded.gender,
  bio = excluded.bio,
  occupation = excluded.occupation,
  education = excluded.education,
  public_location = excluded.public_location,
  profile_completed_at = excluded.profile_completed_at;

with demo_private(email, date_of_birth) as (
  values
    ('test1@gmail.com', date '1998-05-14'),
    ('test2@gmail.com', date '1999-09-22'),
    ('test3@gmail.com', date '1997-12-03')
)
insert into public.profile_private (
  user_id,
  date_of_birth,
  latitude,
  longitude,
  location_consent,
  location_updated_at
)
select
  u.id,
  p.date_of_birth,
  null,
  null,
  false,
  null
from demo_private p
join auth.users u on u.email = p.email
on conflict (user_id) do update
set
  date_of_birth = excluded.date_of_birth,
  latitude = null,
  longitude = null,
  location_consent = false,
  location_updated_at = null;

with demo_languages(email, language_code) as (
  values
    ('test1@gmail.com', 'vi'),
    ('test1@gmail.com', 'en'),
    ('test2@gmail.com', 'vi'),
    ('test2@gmail.com', 'en'),
    ('test3@gmail.com', 'vi')
)
insert into public.profile_languages (profile_id, language_code)
select u.id, d.language_code
from demo_languages d
join auth.users u on u.email = d.email
on conflict (profile_id, language_code) do nothing;

with demo_interest_map(email, interest_slug) as (
  values
    ('test1@gmail.com', 'books'),
    ('test1@gmail.com', 'coffee'),
    ('test2@gmail.com', 'music'),
    ('test2@gmail.com', 'photography'),
    ('test3@gmail.com', 'hiking')
)
insert into public.profile_interests (profile_id, interest_id)
select u.id, i.id
from demo_interest_map d
join auth.users u on u.email = d.email
join public.interests i on i.slug = d.interest_slug
on conflict (profile_id, interest_id) do nothing;

with demo_preferences(email, age_min, age_max, preferred_genders, preferred_languages) as (
  values
    ('test1@gmail.com', 18::smallint, 99::smallint, array['woman']::text[], array['vi', 'en']::text[]),
    ('test2@gmail.com', 18::smallint, 99::smallint, array['man']::text[], array['vi', 'en']::text[]),
    ('test3@gmail.com', 18::smallint, 99::smallint, array[]::text[], array['vi']::text[])
)
insert into public.user_preferences (
  user_id,
  age_min,
  age_max,
  distance_km,
  preferred_genders,
  preferred_languages
)
select
  u.id,
  d.age_min,
  d.age_max,
  null,
  d.preferred_genders,
  d.preferred_languages
from demo_preferences d
join auth.users u on u.email = d.email
on conflict (user_id) do update
set
  age_min = excluded.age_min,
  age_max = excluded.age_max,
  distance_km = null,
  preferred_genders = excluded.preferred_genders,
  preferred_languages = excluded.preferred_languages;

-- Read-only evidence to capture after the inserts above.
select
  u.email,
  u.email_confirmed_at is not null as email_confirmed,
  p.display_name,
  p.gender,
  p.profile_completed_at is not null as profile_completed,
  extract(year from age(current_date, pp.date_of_birth))::integer as derived_age,
  pref.distance_km,
  pref.preferred_genders,
  pref.preferred_languages
from auth.users u
join public.profiles p on p.id = u.id
join public.profile_private pp on pp.user_id = p.id
join public.user_preferences pref on pref.user_id = p.id
where u.email in ('test1@gmail.com', 'test2@gmail.com', 'test3@gmail.com')
order by u.email;
