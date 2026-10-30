-- Private profile-photo bucket. Objects are downloaded through authenticated Storage APIs or short-lived signed URLs.
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
