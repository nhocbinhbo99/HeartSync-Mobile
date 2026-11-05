-- Extend the existing call lifecycle to video without changing deployed migrations.
create or replace function public.start_call(p_match_id uuid,p_type public.call_type)
returns uuid language plpgsql security definer set search_path = '' as $$
declare a uuid:=auth.uid(); b uuid; c uuid; lo uuid; hi uuid;
begin
 if a is null or not private.can_use_active_match(p_match_id) then raise exception using errcode='42501',message='active_match_required'; end if;
 if p_type is null or p_type not in ('audio'::public.call_type,'video'::public.call_type) then raise exception using errcode='22023',message='invalid_call_type'; end if;
 select user_low_id,user_high_id into lo,hi from public.matches where id=p_match_id;
 perform pg_advisory_xact_lock(hashtextextended(lo::text,0)); perform pg_advisory_xact_lock(hashtextextended(hi::text,0));
 b:=case when a=lo then hi else lo end;
 update public.calls set status='missed',ended_at=now() where status='ringing' and started_at<now()-interval '45 seconds' and (caller_id in(a,b) or callee_id in(a,b));
 if exists(select 1 from public.calls where status in('ringing','accepted','connecting','connected') and (caller_id in(a,b) or callee_id in(a,b))) then raise exception using errcode='23505',message='participant_busy'; end if;
 insert into public.calls(match_id,caller_id,callee_id,type) values(p_match_id,a,b,p_type) returning id into c; return c;
end $$;
revoke execute on function public.start_call(uuid,public.call_type) from public,anon;
grant execute on function public.start_call(uuid,public.call_type) to authenticated;
