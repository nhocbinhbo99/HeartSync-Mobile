-- Migration: Comprehensive permissions fix for saving personal profiles, photos, preferences, and saved profiles.
-- Safe and idempotent to run in Supabase SQL Editor or via CLI migrations.

grant usage on schema private to authenticated;

grant execute on function private.profile_public_json(uuid) to authenticated;
grant execute on function private.set_updated_at() to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;
grant execute on function private.is_eligible_profile(uuid) to authenticated;
grant execute on function private.is_blocked_between(uuid, uuid) to authenticated;

-- Ensure private triggers/functions run cleanly with definer rights if needed
alter function private.profile_public_json(uuid) security definer;
alter function private.set_updated_at() security definer;

-- Table grants for authenticated users
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.profile_private to authenticated;
grant select, insert, update, delete on public.profile_photos to authenticated;
grant select, insert, delete on public.profile_interests to authenticated;
grant select, insert, delete on public.profile_languages to authenticated;
grant select on public.interests to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.saved_profiles to authenticated;

-- Add missing UPDATE policy on saved_profiles required by PostgREST upsert
drop policy if exists saved_profiles_update_own on public.saved_profiles;
create policy saved_profiles_update_own on public.saved_profiles
for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id and (select private.can_view_profile(target_id)));

-- Ensure RPC functions are security definer and executable by authenticated
alter function public.save_my_profile(text, text, date, text, text, text, text, text[], text[], boolean, numeric, numeric) security definer;
alter function public.save_my_private_location(boolean, numeric, numeric) security definer;
alter function public.save_my_preferences(smallint, smallint, smallint, text[], text[]) security definer;
alter function public.reorder_profile_photos(uuid[]) security definer;
alter function public.set_primary_profile_photo(uuid) security definer;
alter function public.list_saved_profiles(integer, timestamptz) security definer;

grant execute on function public.save_my_profile(text, text, date, text, text, text, text, text[], text[], boolean, numeric, numeric) to authenticated;
grant execute on function public.save_my_private_location(boolean, numeric, numeric) to authenticated;
grant execute on function public.save_my_preferences(smallint, smallint, smallint, text[], text[]) to authenticated;
grant execute on function public.reorder_profile_photos(uuid[]) to authenticated;
grant execute on function public.set_primary_profile_photo(uuid) to authenticated;
grant execute on function public.list_saved_profiles(integer, timestamptz) to authenticated;
