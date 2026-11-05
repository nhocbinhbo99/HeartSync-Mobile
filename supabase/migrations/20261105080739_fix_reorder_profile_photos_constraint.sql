-- Forward-only repair for the function already deployed by
-- 20261103120000_profile_preferences_contracts.sql.
-- profile_photos_profile_order_unique is DEFERRABLE INITIALLY DEFERRED, so
-- reordering does not need SET CONSTRAINTS. Omitting it also keeps the
-- SECURITY DEFINER function independent from search_path constraint lookup.

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

revoke execute on function public.reorder_profile_photos(uuid[]) from public, anon;
grant execute on function public.reorder_profile_photos(uuid[]) to authenticated;
