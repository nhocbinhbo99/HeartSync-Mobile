-- Manual cloud seed for the three dedicated HeartSync MVP test accounts.
--
-- Prerequisite: create these *confirmed* Auth users in the Supabase dashboard:
--   heartsync.test.a@example.com
--   heartsync.test.b@example.com
--   heartsync.test.c@example.com
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
  where email in (
    'heartsync.test.a@example.com',
    'heartsync.test.b@example.com',
    'heartsync.test.c@example.com'
  );

  if found_email_count <> expected_email_count then
    raise exception
      'Create the three confirmed HeartSync synthetic Auth users before running this seed (found %, expected %).',
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
on conflict (slug) do update
do nothing;

with demo_profiles(email, display_name, gender, bio, occupation, education, public_location) as (
  values
    ('heartsync.test.a@example.com', 'An Bình', 'man', 'Thích sách, cà phê và những cuộc trò chuyện tử tế.', 'Thiết kế sản phẩm', 'Đại học', 'Quận 1, TP. Hồ Chí Minh'),
    ('heartsync.test.b@example.com', 'Bảo Chi', 'woman', 'Yêu âm nhạc, ảnh film và chuyến đi cuối tuần.', 'Truyền thông', 'Đại học', 'Quận 3, TP. Hồ Chí Minh'),
    ('heartsync.test.c@example.com', 'Cẩm Dương', 'nonbinary', 'Hồ sơ synthetic để kiểm thử quyền riêng tư và bộ lọc.', 'Kiểm thử phần mềm', 'Cao đẳng', 'Thủ Đức, TP. Hồ Chí Minh')
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
    ('heartsync.test.a@example.com', date '1998-05-14'),
    ('heartsync.test.b@example.com', date '1999-09-22'),
    ('heartsync.test.c@example.com', date '1997-12-03')
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
    ('heartsync.test.a@example.com', 'vi'),
    ('heartsync.test.a@example.com', 'en'),
    ('heartsync.test.b@example.com', 'vi'),
    ('heartsync.test.b@example.com', 'en'),
    ('heartsync.test.c@example.com', 'vi')
)
insert into public.profile_languages (profile_id, language_code)
select u.id, d.language_code
from demo_languages d
join auth.users u on u.email = d.email
on conflict (profile_id, language_code) do nothing;

with demo_interest_map(email, interest_slug) as (
  values
    ('heartsync.test.a@example.com', 'books'),
    ('heartsync.test.a@example.com', 'coffee'),
    ('heartsync.test.b@example.com', 'music'),
    ('heartsync.test.b@example.com', 'photography'),
    ('heartsync.test.c@example.com', 'hiking')
)
insert into public.profile_interests (profile_id, interest_id)
select u.id, i.id
from demo_interest_map d
join auth.users u on u.email = d.email
join public.interests i on i.slug = d.interest_slug
on conflict (profile_id, interest_id) do nothing;

with demo_preferences(email, age_min, age_max, preferred_genders, preferred_languages) as (
  values
    ('heartsync.test.a@example.com', 18::smallint, 99::smallint, array['woman']::text[], array['vi', 'en']::text[]),
    ('heartsync.test.b@example.com', 18::smallint, 99::smallint, array['man']::text[], array['vi', 'en']::text[]),
    ('heartsync.test.c@example.com', 18::smallint, 99::smallint, array[]::text[], array['vi']::text[])
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
where u.email in (
  'heartsync.test.a@example.com',
  'heartsync.test.b@example.com',
  'heartsync.test.c@example.com'
)
order by u.email;
