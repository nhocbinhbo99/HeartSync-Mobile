-- Migration: Fix profile saving permissions and private.profile_public_json execution rights
-- Ensures authenticated users can atomically save profiles without encountering 42501 permission denied errors.

grant usage on schema private to authenticated;
grant execute on function private.profile_public_json(uuid) to authenticated;

-- Ensure authenticated role has full required table privileges for personal profile operations
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.profile_private to authenticated;
grant select, insert, delete on public.profile_interests to authenticated;
grant select, insert, delete on public.profile_languages to authenticated;
grant select on public.interests to authenticated;

-- Re-grant execute on save_my_profile RPC
grant execute on function public.save_my_profile(
  text, text, date, text, text, text, text, text[], text[], boolean, numeric, numeric
) to authenticated;
