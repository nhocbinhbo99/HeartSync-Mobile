-- Forward-only Module 3 contracts. Apply to development after local verification.
create index if not exists messages_cursor_idx on public.messages(match_id, sent_at desc, id desc);
create index if not exists messages_unread_idx on public.messages(match_id, sender_id) where read_at is null;
create or replace function public.send_chat_message(p_match_id uuid, p_client_message_id uuid, p_content text)
returns public.messages language plpgsql security definer set search_path = '' as $$
declare v public.messages;
begin
 if auth.uid() is null or not private.can_use_active_match(p_match_id) then raise exception using errcode='42501',message='active_match_required'; end if;
 if char_length(btrim(p_content)) not between 1 and 4000 then raise exception using errcode='22023',message='invalid_message'; end if;
 insert into public.messages(match_id,sender_id,client_message_id,content) values(p_match_id,auth.uid(),p_client_message_id,btrim(p_content)) on conflict(sender_id,client_message_id) do nothing returning * into v;
 if v.id is null then select * into v from public.messages where sender_id=auth.uid() and client_message_id=p_client_message_id; end if;
 if v.match_id <> p_match_id or v.content <> btrim(p_content) then raise exception using errcode='22023',message='message_identity_conflict'; end if;
 return v;
end $$;
create or replace function public.mark_messages_read(p_match_id uuid,p_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not private.can_read_match_history(p_match_id) then raise exception using errcode='42501',message='match_access_denied'; end if;
 if coalesce(array_length(p_ids,1),0)>200 then raise exception using errcode='22023',message='too_many_messages'; end if;
 update public.messages set read_at=now() where match_id=p_match_id and id=any(p_ids) and sender_id<>auth.uid() and read_at is null;
end $$;
create or replace function public.chat_summaries()
returns table(match_id uuid,last_message_at timestamptz,unread_count bigint,last_read_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select m.id,max(msg.sent_at),count(msg.id) filter(where msg.sender_id<>auth.uid() and msg.read_at is null),max(msg.read_at) filter(where msg.sender_id=auth.uid())
 from public.matches m left join public.messages msg on msg.match_id=m.id
 where m.status='active' and private.can_use_active_match(m.id) group by m.id;
$$;
-- Serialize all call creation on both participants, in canonical order.
create or replace function public.start_call(p_match_id uuid,p_type public.call_type)
returns uuid language plpgsql security definer set search_path = '' as $$
declare a uuid:=auth.uid(); b uuid; c uuid; lo uuid; hi uuid;
begin
 if a is null or not private.can_use_active_match(p_match_id) then raise exception using errcode='42501',message='active_match_required'; end if;
 if p_type<>'audio' then raise exception using errcode='22023',message='audio_only_in_mvp'; end if;
 select user_low_id,user_high_id into lo,hi from public.matches where id=p_match_id;
 perform pg_advisory_xact_lock(hashtextextended(lo::text,0)); perform pg_advisory_xact_lock(hashtextextended(hi::text,0));
 b:=case when a=lo then hi else lo end;
 update public.calls set status='missed',ended_at=now() where status='ringing' and started_at<now()-interval '45 seconds' and (caller_id in(a,b) or callee_id in(a,b));
 if exists(select 1 from public.calls where status in('ringing','accepted','connecting','connected') and (caller_id in(a,b) or callee_id in(a,b))) then raise exception using errcode='23505',message='participant_busy'; end if;
 insert into public.calls(match_id,caller_id,callee_id,type) values(p_match_id,a,b,p_type) returning id into c; return c;
end $$;
create or replace function public.reconcile_calls()
returns void language plpgsql security definer set search_path = '' as $$
begin
 update public.calls c set status=case when c.status='ringing' then 'missed'::public.call_status else 'ended'::public.call_status end,ended_at=now()
 where auth.uid() in(c.caller_id,c.callee_id) and c.status in('ringing','accepted','connecting','connected')
 and ((c.status='ringing' and c.started_at<now()-interval '45 seconds') or not private.can_use_active_match(c.match_id));
end $$;
create or replace function public.accept_call(p_call_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
 update public.calls c set status='accepted' where c.id=p_call_id and c.callee_id=auth.uid() and c.status='ringing' and c.started_at>now()-interval '45 seconds' and private.can_use_active_match(c.match_id) returning c.id into v;
 if v is null then select id into v from public.calls c where c.id=p_call_id and c.callee_id=auth.uid() and c.status='accepted' and private.can_use_active_match(c.match_id); end if;
 if v is null then raise exception using errcode='42501',message='call_access_denied'; end if; return v;
end $$;
create or replace function public.end_call(p_call_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.calls where id=p_call_id and auth.uid() in(caller_id,callee_id)) then raise exception using errcode='42501',message='call_access_denied'; end if;
 update public.calls set status='ended',ended_at=now() where id=p_call_id and status in('ringing','accepted','connecting','connected'); return p_call_id;
end $$;
revoke all on function public.send_chat_message(uuid,uuid,text),public.mark_messages_read(uuid,uuid[]),public.chat_summaries(),public.reconcile_calls() from public,anon;
grant execute on function public.send_chat_message(uuid,uuid,text),public.mark_messages_read(uuid,uuid[]),public.chat_summaries(),public.reconcile_calls() to authenticated;

create or replace function public.list_chat_matches(p_cursor text default null)
returns table(id uuid,other_profile jsonb,created_at timestamptz,last_message_preview text,last_message_at timestamptz,unread_count bigint,cursor_created_at text)
language sql stable security definer set search_path = '' as $$
 with summaries as (
 select m.id,private.profile_public_json(case when m.user_low_id=auth.uid() then m.user_high_id else m.user_low_id end) as other_profile,m.created_at,
 (select content from public.messages where match_id=m.id order by sent_at desc,id desc limit 1) as preview,
 coalesce((select max(sent_at) from public.messages where match_id=m.id),m.created_at) as activity,
 (select count(*) from public.messages where match_id=m.id and sender_id<>auth.uid() and read_at is null) as unread
 from public.matches m where m.status='active' and private.can_use_active_match(m.id)
 ) select s.id,s.other_profile,s.created_at,s.preview,s.activity,s.unread,s.activity::text||'|'||s.id::text from summaries s
 where p_cursor is null or (s.activity,s.id)<(split_part(p_cursor,'|',1)::timestamptz,split_part(p_cursor,'|',2)::uuid)
 order by s.activity desc,s.id desc limit 30;
$$;
revoke all on function public.list_chat_matches(text) from public,anon;
grant execute on function public.list_chat_matches(text) to authenticated;

-- Durable media cleanup queue: no secrets in SQL or mobile bundle.
create table private.call_media_cleanup(call_id uuid primary key,caller_id uuid not null,callee_id uuid not null,queued_at timestamptz not null default now());
revoke all on private.call_media_cleanup from public,anon,authenticated;
create function private.enqueue_call_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in('ended','rejected','missed','failed') then
 insert into private.call_media_cleanup(call_id,caller_id,callee_id) values(new.id,new.caller_id,new.callee_id) on conflict do nothing;
 end if; return new;
end $$;
create trigger enqueue_call_cleanup after update of status on public.calls for each row execute function private.enqueue_call_cleanup();
create function private.end_unmatched_calls() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='unmatched' then update public.calls set status='ended',ended_at=now() where match_id=new.id and status in('ringing','accepted','connecting','connected'); end if; return new;
end $$;
create trigger end_unmatched_calls after update of status on public.matches for each row execute function private.end_unmatched_calls();
create function public.pending_call_cleanup() returns setof private.call_media_cleanup language plpgsql security definer set search_path='' as $$
begin
 update public.calls set status='missed',ended_at=now() where status='ringing' and started_at<now()-interval '45 seconds';
 return query select * from private.call_media_cleanup order by queued_at limit 100;
end $$;
create function public.ack_call_cleanup(p_call_id uuid) returns void language sql security definer set search_path='' as $$ delete from private.call_media_cleanup where call_id=p_call_id $$;
revoke all on function public.pending_call_cleanup(),public.ack_call_cleanup(uuid) from public,anon,authenticated;
grant execute on function public.pending_call_cleanup(),public.ack_call_cleanup(uuid) to service_role;

create or replace function public.reject_call(p_call_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v uuid;
begin
 update public.calls set status='rejected',ended_at=now() where id=p_call_id and callee_id=auth.uid() and status='ringing' returning id into v;
 if v is null then select id into v from public.calls where id=p_call_id and callee_id=auth.uid() and status='rejected'; end if;
 if v is null then raise exception using errcode='42501',message='call_access_denied'; end if;return v;
end $$;

-- RLS still scopes match lifecycle events to participants.
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='matches') then
 alter publication supabase_realtime add table public.matches;
 end if;
end $$;
