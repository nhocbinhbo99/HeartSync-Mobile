-- Transactional profile, preference, photo-order and saved-profile contracts.
-- Forward-only: the previous migrations may already exist on heartsync-dev.

alter table public.profile_photos
  drop constraint if exists profile_photos_profile_id_sort_order_key;

alter table public.profile_photos
  add constraint profile_photos_profile_order_unique
  unique (profile_id, sort_order)
  deferrable initially deferred;

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
  if cardinality(coalesce(p_photo_ids, '{}')) <> cardinality(array(select distinct value from unnest(coalesce(p_photo_ids, '{}')) value)) then
    raise exception using errcode = '22023', message = 'duplicate_photo';
  end if;

  select count(*) into v_owned_count from public.profile_photos where profile_id = v_user_id;
  if v_owned_count <> cardinality(coalesce(p_photo_ids, '{}'))
    or exists (
      select 1 from unnest(coalesce(p_photo_ids, '{}')) value
      where not exists (
        select 1 from public.profile_photos photo
        where photo.id = value and photo.profile_id = v_user_id
      )
    ) then
    raise exception using errcode = '42501', message = 'photo_access_denied';
  end if;

  set constraints all deferred;
  update public.profile_photos set is_primary = false where profile_id = v_user_id;
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

revoke execute on function public.save_my_profile(text, text, date, text, text, text, text, text[], text[], boolean, numeric, numeric) from public, anon;
revoke execute on function public.save_my_private_location(boolean, numeric, numeric) from public, anon;
revoke execute on function public.save_my_preferences(smallint, smallint, smallint, text[], text[]) from public, anon;
revoke execute on function public.reorder_profile_photos(uuid[]) from public, anon;
revoke execute on function public.set_primary_profile_photo(uuid) from public, anon;
revoke execute on function public.list_saved_profiles(integer, timestamptz) from public, anon;

grant execute on function public.save_my_profile(text, text, date, text, text, text, text, text[], text[], boolean, numeric, numeric) to authenticated;
grant execute on function public.save_my_private_location(boolean, numeric, numeric) to authenticated;
grant execute on function public.save_my_preferences(smallint, smallint, smallint, text[], text[]) to authenticated;
grant execute on function public.reorder_profile_photos(uuid[]) to authenticated;
grant execute on function public.set_primary_profile_photo(uuid) to authenticated;
grant execute on function public.list_saved_profiles(integer, timestamptz) to authenticated;
