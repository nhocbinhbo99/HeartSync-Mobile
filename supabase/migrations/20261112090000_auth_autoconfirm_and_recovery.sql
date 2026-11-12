-- Migration: Auto-confirm new users and provide dev helper RPC to bypass Supabase Free Tier SMTP rate limits (2-3 emails/hour).
-- Safe and idempotent to run in Supabase SQL Editor or via CLI migrations.

create or replace function public.handle_auto_confirm_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := timezone('utc', now());
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_auto_confirm on auth.users;
create trigger on_auth_user_auto_confirm
before insert on auth.users
for each row
execute function public.handle_auto_confirm_user();

-- Confirm any existing unconfirmed accounts so they can sign in and receive password recovery emails
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now()))
where email_confirmed_at is null;

-- Helper RPC callable by anon/authenticated clients when Supabase Auth has "Confirm email" enabled
-- but built-in SMTP fails to deliver confirmation emails or hits rate limits.
create or replace function public.confirm_user_email_for_dev(target_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized text := lower(btrim(coalesce(target_email, '')));
  updated_count integer := 0;
begin
  if normalized = '' then
    return false;
  end if;

  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
      updated_at = timezone('utc', now())
  where lower(email) = normalized;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

grant execute on function public.confirm_user_email_for_dev(text) to anon, authenticated;

