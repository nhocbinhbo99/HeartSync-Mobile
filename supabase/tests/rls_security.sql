-- Run after `supabase db reset` with `supabase test db`.
-- This file is prepared but has not been executed in this workspace (Docker daemon/CLI unavailable).
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'a@example.test', extensions.crypt('not-a-real-password', extensions.gen_salt('bf')), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'b@example.test', extensions.crypt('not-a-real-password', extensions.gen_salt('bf')), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'c@example.test', extensions.crypt('not-a-real-password', extensions.gen_salt('bf')), now(), '{}', '{}');

insert into public.profiles (id, display_name, gender, profile_completed_at)
values
  ('00000000-0000-0000-0000-000000000001', 'User A', 'other', now()),
  ('00000000-0000-0000-0000-000000000002', 'User B', 'other', now()),
  ('00000000-0000-0000-0000-000000000003', 'User C', 'other', now());
insert into public.profile_private (user_id, date_of_birth)
values
  ('00000000-0000-0000-0000-000000000001', date '1990-01-01'),
  ('00000000-0000-0000-0000-000000000002', date '1991-01-01'),
  ('00000000-0000-0000-0000-000000000003', date '1992-01-01');
insert into public.matches (id, user_low_id, user_high_id)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');

set local role anon;
select throws_ok(
  $$ select * from public.profiles $$,
  '42501', 'permission denied for table profiles',
  'anonymous users cannot read profiles'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$ update public.profiles set display_name = 'Compromised' where id = '00000000-0000-0000-0000-000000000002' $$,
  'cross-user profile update is filtered without exposing the row'
);
reset role;
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-000000000002'),
  'User B',
  'user A cannot change user B profile'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$ insert into public.messages(match_id, sender_id, client_message_id, content)
     values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'not allowed') $$,
  '42501',
  'new row violates row-level security policy for table "messages"',
  'non-participant chat is denied for an existing match'
);
select throws_ok(
  $$ select * from public.record_swipe('00000000-0000-0000-0000-000000000001', 'like') $$,
  '22023', 'invalid_swipe_target',
  'self-like is denied'
);
select results_eq(
  $$ select outcome from public.record_swipe('00000000-0000-0000-0000-000000000002', 'like') $$,
  array['liked'::text],
  'first one-way like does not create a match'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select results_eq(
  $$ select outcome from public.record_swipe('00000000-0000-0000-0000-000000000001', 'like') $$,
  array['matched'::text],
  'reverse like atomically creates the match'
);
reset role;
select is(
  (select count(*) from public.matches where user_low_id = '00000000-0000-0000-0000-000000000001' and user_high_id = '00000000-0000-0000-0000-000000000002'),
  1::bigint,
  'canonical pair has exactly one match'
);
select set_config(
  'test.ab_match_id',
  (select id::text from public.matches where user_low_id = '00000000-0000-0000-0000-000000000001' and user_high_id = '00000000-0000-0000-0000-000000000002'),
  true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select results_eq(
  $$ select outcome from public.record_swipe('00000000-0000-0000-0000-000000000002', 'like') $$,
  array['matched'::text],
  'duplicate like is idempotent and returns the existing match'
);
select lives_ok(
  $$ insert into public.messages(match_id, sender_id, client_message_id, content)
     values (current_setting('test.ab_match_id')::uuid, '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'allowed') $$,
  'an active match participant can send a message'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$ select public.block_user('00000000-0000-0000-0000-000000000001') $$,
  'blocking a user atomically unmatches the pair'
);
select is(
  (select status::text from public.matches where user_low_id = '00000000-0000-0000-0000-000000000001' and user_high_id = '00000000-0000-0000-0000-000000000002'),
  null,
  'blocked match history is hidden from the participant'
);
select throws_ok(
  $$ insert into public.messages(match_id, sender_id, client_message_id, content)
     values (current_setting('test.ab_match_id')::uuid, '00000000-0000-0000-0000-000000000002', gen_random_uuid(), 'blocked') $$,
  '42501',
  'new row violates row-level security policy for table "messages"',
  'blocked pair cannot insert a new message'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$ insert into public.reports(reporter_id, reported_id, reason, details)
     values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'spam', 'test evidence') $$,
  'reporter can create a private report'
);
select is((select count(*) from public.reports), 1::bigint, 'reporter can read own report');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.reports), 0::bigint, 'reported user cannot read report');
select is((select count(*) from public.profile_private), 1::bigint, 'user can read only own private profile row');
reset role;

select * from finish();
rollback;
