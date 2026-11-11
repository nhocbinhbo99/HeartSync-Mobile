-- Forward-only repair for the initial AI quota migration. In PostgreSQL ARE,
-- the prior double backslash pattern matched a literal "\\d", not a digit.
-- Use an unambiguous character class so valid Vietnam date period keys can be
-- reserved for an Icebreaker. Both the quota bucket and request constraints
-- must be corrected: reservation inserts the bucket first.

alter table public.ai_quota_buckets
  drop constraint if exists ai_quota_buckets_period_key_check;

alter table public.ai_quota_buckets
  add constraint ai_quota_buckets_period_key_check check (
    period_key = 'lifetime' or period_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  );

alter table private.ai_generation_requests
  drop constraint if exists ai_generation_request_shape;

alter table private.ai_generation_requests
  add constraint ai_generation_request_shape check (
    (feature = 'profile_bio' and period_key = 'lifetime' and match_id is null)
    or (feature = 'icebreaker' and period_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and match_id is not null)
  );

notify pgrst, 'reload schema';
