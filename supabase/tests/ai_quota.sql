-- Run after `supabase db reset` with `supabase test db`.
-- Database integration: quotas, idempotency, RLS, refund and active-Match authorization.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'ai-a@example.test', extensions.crypt('not-a-real-password', extensions.gen_salt('bf')), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'ai-b@example.test', extensions.crypt('not-a-real-password', extensions.gen_salt('bf')), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'ai-c@example.test', extensions.crypt('not-a-real-password', extensions.gen_salt('bf')), now(), '{}', '{}');
insert into public.profiles (id, display_name, gender, profile_completed_at)
values
  ('00000000-0000-0000-0000-000000000011', 'AI User A', 'woman', now()),
  ('00000000-0000-0000-0000-000000000012', 'AI User B', 'man', now()),
  ('00000000-0000-0000-0000-000000000013', 'AI User C', 'nonbinary', now());
insert into public.profile_private (user_id, date_of_birth)
values
  ('00000000-0000-0000-0000-000000000011', date '1990-01-01'),
  ('00000000-0000-0000-0000-000000000012', date '1991-01-01'),
  ('00000000-0000-0000-0000-000000000013', date '1992-01-01');
insert into public.matches (id, user_low_id, user_high_id)
values ('10000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012');

set local role anon;
select throws_ok($$ select public.get_ai_quotas() $$, '42501', 'permission denied for function get_ai_quotas', 'anonymous caller cannot read AI quota RPC');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select is((public.get_ai_quotas()->'profile_bio'->>'remaining')::integer, 2, 'Bio starts with two lifetime generations');
select is(public.reserve_ai_request('profile_bio', '10000000-0000-4000-8000-000000000011', null)->>'state', 'reserved', 'first Bio reserves one slot');
select is(public.finalize_ai_request('10000000-0000-4000-8000-000000000011', jsonb_build_object('action','generate_bio','request_id','10000000-0000-4000-8000-000000000011','suggestion','test'))->>'state', 'completed', 'first Bio finalizes successfully');
select is((public.get_ai_quotas()->'profile_bio'->>'used')::integer, 1, 'successful Bio increments lifetime count once');
select is(public.reserve_ai_request('profile_bio', '10000000-0000-4000-8000-000000000011', null)->>'state', 'completed', 'same request ID returns cached completed result');
select is((public.get_ai_quotas()->'profile_bio'->>'used')::integer, 1, 'same completed request does not double charge');
select is(public.reserve_ai_request('profile_bio', '10000000-0000-4000-8000-000000000012', null)->>'state', 'reserved', 'second Bio reserves');
select is(public.finalize_ai_request('10000000-0000-4000-8000-000000000012', jsonb_build_object('action','generate_bio','request_id','10000000-0000-4000-8000-000000000012','suggestion','test'))->>'state', 'completed', 'second Bio finalizes');
select is(public.reserve_ai_request('profile_bio', '10000000-0000-4000-8000-000000000013', null)->>'state', 'quota_exhausted', 'third Bio is blocked server-side');
select is((select count(*) from public.ai_quota_buckets where user_id = auth.uid() and feature = 'profile_bio'), 1::bigint, 'user sees only own readable quota bucket');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
select is(public.reserve_ai_request('profile_bio', '20000000-0000-4000-8000-000000000011', null)->>'state', 'reserved', 'second user can reserve independently');
select is(public.fail_ai_request('20000000-0000-4000-8000-000000000011', 'AI_OUTPUT_INVALID')->>'state', 'failed', 'invalid provider output releases reservation');
select is((public.get_ai_quotas()->'profile_bio'->>'used')::integer, 0, 'provider failure does not consume a Bio generation');
select is((public.get_ai_quotas()->'profile_bio'->>'remaining')::integer, 2, 'provider failure restores the reserved Bio generation');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select is(public.reserve_ai_request('icebreaker', '30000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000010')->>'state', 'reserved', 'active Match can reserve an Icebreaker');
select is(public.fail_ai_request('30000000-0000-4000-8000-000000000011', 'AI_TEMPORARILY_UNAVAILABLE')->>'state', 'failed', 'provider outage refunds Icebreaker reservation');
select matches(public.get_ai_quotas()->'icebreaker'->>'reset_at', '^[0-9]{4}-[0-9]{2}-[0-9]{2}T00:00:00[+]07:00$', 'Icebreaker reset is returned at midnight Vietnam time');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000013', true);
select throws_ok($$ select public.reserve_ai_request('icebreaker', '30000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000010') $$, '42501', 'match_not_allowed', 'non-participant cannot reserve an Icebreaker');
reset role;

select * from finish();
rollback;
