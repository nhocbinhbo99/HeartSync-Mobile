-- Manual cloud seed for additional HeartSync discovery candidates.
--
-- Prerequisite: create and Auto Confirm these Auth users from
-- Authentication -> Users -> Add user -> Create new user. Do not use
-- "Send invitation" because these are synthetic test addresses.
--
--   ex4@gmail.com   through   ex12@gmail.com
--
-- Set a team-only test password in the Dashboard. Never put that password in
-- this file, Git, screenshots, or chat. This script intentionally does not
-- write to Supabase-managed auth tables and does not create real identities.
--
-- Safe to re-run for the same nine users. It refreshes their profile,
-- languages, interests and preferences. It does not delete swipes, matches,
-- messages, blocks, reports, calls, saved profiles or Storage objects.

begin;

create temporary table hs_demo_candidates (
  ordinal integer primary key,
  email text not null unique,
  display_name text not null,
  gender text not null,
  date_of_birth date not null,
  bio text not null,
  occupation text not null,
  education text not null,
  public_location text not null,
  location_consent boolean not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  languages text[] not null,
  interest_slugs text[] not null,
  preferred_genders text[] not null,
  preferred_languages text[] not null
) on commit drop;

insert into hs_demo_candidates (
  ordinal,
  email,
  display_name,
  gender,
  date_of_birth,
  bio,
  occupation,
  education,
  public_location,
  location_consent,
  latitude,
  longitude,
  languages,
  interest_slugs,
  preferred_genders,
  preferred_languages
)
values
  (
    4, 'ex4@gmail.com', 'Linh Anh', 'woman', date '2002-03-18',
    'Thích nhiếp ảnh đường phố, cà phê và những buổi triển lãm nhỏ.',
    'Thiết kế / Sáng tạo', 'Đại học', 'TP. Hồ Chí Minh',
    true, 10.776889, 106.700806,
    array['vi', 'en']::text[], array['art', 'coffee', 'photography']::text[],
    array['man', 'woman']::text[], array['vi', 'en']::text[]
  ),
  (
    5, 'ex5@gmail.com', 'Thu Hà', 'woman', date '1997-07-09',
    'Cuối tuần thường đi xem phim, nghe nhạc và lên kế hoạch cho chuyến đi mới.',
    'Marketing / Truyền thông', 'Sau đại học', 'TP. Hồ Chí Minh',
    true, 10.790500, 106.681700,
    array['vi', 'fr']::text[], array['movies', 'music', 'travel']::text[],
    array['man']::text[], array['vi']::text[]
  ),
  (
    6, 'ex6@gmail.com', 'Quốc Bảo', 'man', date '1995-11-21',
    'Làm phần mềm, thích công nghệ mới, board game và cà phê rang nhẹ.',
    'Công nghệ thông tin', 'Đại học', 'TP. Hồ Chí Minh',
    true, 10.849100, 106.771600,
    array['vi', 'en']::text[], array['coffee', 'gaming', 'technology']::text[],
    array['woman']::text[], array['vi', 'en']::text[]
  ),
  (
    7, 'ex7@gmail.com', 'Gia Hân', 'nonbinary', date '2000-02-14',
    'Quan tâm giáo dục cộng đồng, sách và các hoạt động tình nguyện.',
    'Giáo dục', 'Đại học', 'TP. Hồ Chí Minh',
    true, 10.801400, 106.711000,
    array['vi', 'en']::text[], array['books', 'nature', 'volunteering']::text[],
    array[]::text[], array['vi', 'en']::text[]
  ),
  (
    8, 'ex8@gmail.com', 'Mai Phương', 'woman', date '1993-06-30',
    'Yêu biển, chạy bộ buổi sáng và những chuyến đi gần thiên nhiên.',
    'Y tế', 'Sau đại học', 'Đà Nẵng',
    true, 16.054400, 108.202200,
    array['vi', 'en']::text[], array['fitness', 'hiking', 'travel']::text[],
    array['man', 'woman']::text[], array['vi', 'en']::text[]
  ),
  (
    9, 'ex9@gmail.com', 'Đức Minh', 'man', date '2003-01-25',
    'Sinh viên yêu trò chơi, phim khoa học viễn tưởng và lập trình ứng dụng.',
    'Sinh viên', 'Đại học', 'Hà Nội',
    true, 21.028500, 105.854200,
    array['vi', 'ja']::text[], array['gaming', 'movies', 'technology']::text[],
    array['woman']::text[], array['vi', 'ja']::text[]
  ),
  (
    10, 'ex10@gmail.com', 'Nhật Lam', 'prefer_not_to_say', date '1998-10-05',
    'Thích nấu ăn, chăm thú cưng và khám phá những góc nghệ thuật mới.',
    'Dịch vụ', 'Cao đẳng', 'Huế',
    false, null, null,
    array['vi']::text[], array['art', 'cooking', 'pets']::text[],
    array[]::text[], array['vi']::text[]
  ),
  (
    11, 'ex11@gmail.com', 'Yến Nhi', 'woman', date '1999-04-16',
    'Cân bằng công việc bằng sách, âm nhạc và các lớp thể thao buổi tối.',
    'Tài chính / Kế toán', 'Đại học', 'TP. Hồ Chí Minh',
    true, 10.805500, 106.689800,
    array['vi', 'en', 'ko']::text[], array['books', 'fitness', 'music']::text[],
    array['man']::text[], array['vi', 'en']::text[]
  ),
  (
    12, 'ex12@gmail.com', 'Hải Nam', 'man', date '1991-12-11',
    'Kỹ sư thích du lịch chậm, thiên nhiên và ghi lại hành trình bằng ảnh.',
    'Kỹ thuật', 'Sau đại học', 'Cần Thơ',
    true, 10.045200, 105.746900,
    array['vi', 'en']::text[], array['nature', 'photography', 'travel']::text[],
    array['woman']::text[], array['vi', 'en']::text[]
  );

do $$
declare
  expected_user_count integer;
  confirmed_user_count integer;
begin
  select count(*) into expected_user_count from hs_demo_candidates;

  select count(*) into confirmed_user_count
  from auth.users u
  join hs_demo_candidates d on lower(u.email) = d.email
  where u.email_confirmed_at is not null;

  if confirmed_user_count <> expected_user_count then
    raise exception
      'Create and Auto Confirm ex4@gmail.com through ex12@gmail.com before running this seed (found %, expected %).',
      confirmed_user_count,
      expected_user_count;
  end if;
end;
$$;

insert into public.profiles (
  id,
  display_name,
  gender,
  bio,
  occupation,
  education,
  public_location,
  profile_completed_at,
  created_at,
  updated_at
)
select
  u.id,
  d.display_name,
  d.gender,
  d.bio,
  d.occupation,
  d.education,
  d.public_location,
  now(),
  clock_timestamp() - d.ordinal * interval '1 minute',
  now()
from hs_demo_candidates d
join auth.users u on lower(u.email) = d.email
on conflict (id) do update
set
  display_name = excluded.display_name,
  gender = excluded.gender,
  bio = excluded.bio,
  occupation = excluded.occupation,
  education = excluded.education,
  public_location = excluded.public_location,
  profile_completed_at = excluded.profile_completed_at,
  updated_at = now();

insert into public.profile_private (
  user_id,
  date_of_birth,
  latitude,
  longitude,
  location_consent,
  location_updated_at,
  updated_at
)
select
  u.id,
  d.date_of_birth,
  case when d.location_consent then d.latitude else null end,
  case when d.location_consent then d.longitude else null end,
  d.location_consent,
  case when d.location_consent then now() else null end,
  now()
from hs_demo_candidates d
join auth.users u on lower(u.email) = d.email
on conflict (user_id) do update
set
  date_of_birth = excluded.date_of_birth,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  location_consent = excluded.location_consent,
  location_updated_at = excluded.location_updated_at,
  updated_at = now();

delete from public.profile_languages language
using auth.users u, hs_demo_candidates d
where language.profile_id = u.id
  and lower(u.email) = d.email;

insert into public.profile_languages (profile_id, language_code)
select u.id, language_value.language_code
from hs_demo_candidates d
join auth.users u on lower(u.email) = d.email
cross join lateral unnest(d.languages) as language_value(language_code)
on conflict (profile_id, language_code) do nothing;

delete from public.profile_interests profile_interest
using auth.users u, hs_demo_candidates d
where profile_interest.profile_id = u.id
  and lower(u.email) = d.email;

insert into public.profile_interests (profile_id, interest_id)
select u.id, interest.id
from hs_demo_candidates d
join auth.users u on lower(u.email) = d.email
cross join lateral unnest(d.interest_slugs) as interest_value(interest_slug)
join public.interests interest on interest.slug = interest_value.interest_slug
on conflict (profile_id, interest_id) do nothing;

insert into public.user_preferences (
  user_id,
  age_min,
  age_max,
  distance_km,
  preferred_genders,
  preferred_languages,
  updated_at
)
select
  u.id,
  18::smallint,
  99::smallint,
  null,
  d.preferred_genders,
  d.preferred_languages,
  now()
from hs_demo_candidates d
join auth.users u on lower(u.email) = d.email
on conflict (user_id) do update
set
  age_min = excluded.age_min,
  age_max = excluded.age_max,
  distance_km = excluded.distance_km,
  preferred_genders = excluded.preferred_genders,
  preferred_languages = excluded.preferred_languages,
  updated_at = now();

commit;

-- Read-only evidence: expect exactly nine complete, adult candidate rows.
select
  u.email,
  u.email_confirmed_at is not null as email_confirmed,
  p.display_name,
  p.gender,
  extract(year from age(current_date, private_profile.date_of_birth))::integer as age,
  p.public_location,
  private_profile.location_consent,
  preference.preferred_genders,
  preference.preferred_languages,
  p.profile_completed_at is not null as profile_completed
from auth.users u
join public.profiles p on p.id = u.id
join public.profile_private private_profile on private_profile.user_id = u.id
join public.user_preferences preference on preference.user_id = u.id
where lower(u.email) in (
  'ex4@gmail.com',
  'ex5@gmail.com',
  'ex6@gmail.com',
  'ex7@gmail.com',
  'ex8@gmail.com',
  'ex9@gmail.com',
  'ex10@gmail.com',
  'ex11@gmail.com',
  'ex12@gmail.com'
)
order by u.email;
