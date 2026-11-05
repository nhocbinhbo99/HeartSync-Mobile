-- Run after `supabase db reset` with `supabase test db`.
-- This file is prepared but has not been executed in this workspace (Docker daemon/CLI unavailable).
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'a@example.test', extensions.crypt('not-a-real-password', extensions.gen_salt('bf')), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'b@example.test', extensions.crypt('not-a-real-password', extensions.gen_salt('bf')), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'c@example.test', extensions.crypt('not-a-real-password', extensions.gen_salt('bf')), now(), '{}', '{}');

insert into public.profiles (id, display_name, gender, profile_completed_at)
values
  ('00000000-0000-0000-0000-000000000001', 'User A', 'man', now()),
  ('00000000-0000-0000-0000-000000000002', 'User B', 'woman', now()),
  ('00000000-0000-0000-0000-000000000003', 'User C', 'nonbinary', now());
insert into public.profile_private (user_id, date_of_birth)
values
  ('00000000-0000-0000-0000-000000000001', date '1990-01-01'),
  ('00000000-0000-0000-0000-000000000002', date '1991-01-01'),
  ('00000000-0000-0000-0000-000000000003', date '1992-01-01');
insert into public.matches (id, user_low_id, user_high_id)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.send_chat_message('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','hello')$$,'participant sends');
select lives_ok($$select public.send_chat_message('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','hello')$$,'retry is idempotent');
select is((select count(*) from public.messages where client_message_id='20000000-0000-0000-0000-000000000001'),1::bigint,'one message after retry');
select throws_ok($$select public.send_chat_message('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','different')$$,'22023','message_identity_conflict','UUID cannot rewrite message');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select is((select unread_count from public.chat_summaries() where match_id='10000000-0000-0000-0000-000000000001'),1::bigint,'recipient has unread');
select public.mark_messages_read('10000000-0000-0000-0000-000000000001',array(select id from public.messages));
select is((select unread_count from public.chat_summaries() where match_id='10000000-0000-0000-0000-000000000001'),0::bigint,'viewed message becomes read');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.send_chat_message('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','attack')$$,'42501','active_match_required','nonparticipant cannot send');
select throws_ok($$select public.mark_messages_read('10000000-0000-0000-0000-000000000001','{}')$$,'42501','match_access_denied','nonparticipant cannot mark read');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.start_call('10000000-0000-0000-0000-000000000001','audio')$$,'participant starts audio');
select throws_ok($$select public.start_call('10000000-0000-0000-0000-000000000001','audio')$$,'23505','participant_busy','second call cannot start');
select lives_ok($$select public.end_call(id) from public.calls$$,'caller cancels');
select lives_ok($$select public.end_call(id) from public.calls$$,'end is idempotent');
select * from finish();rollback;
