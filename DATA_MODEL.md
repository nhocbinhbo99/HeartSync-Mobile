# HeartSync BASE Data Model

Status: **SQL_PREPARED_NOT_APPLIED**. These migrations have not been run locally or remotely. The current machine has `psql`, but no Supabase CLI and no running Docker/PostgreSQL service. Do not treat this document as evidence of a working database.

## Privacy boundary

`profiles` is the only user profile table intended for controlled discovery reads. Its approved public fields are: `id`, `display_name`, `gender`, `bio`, `occupation`, `education`, `public_location`, profile completion time, and timestamps. `public_location` is a coarse, user-approved label—not coordinates or a full address.

`profile_private` is owner-only and holds exact date of birth plus optional coordinates/consent. RLS is row-level and cannot hide selected columns, so DOB and coordinates are physically separated instead of relying on a profile view. The server constraint requires a supplied DOB to be at least 18 years in the past; this validates the claimed date but is not identity or age-verification evidence.

Auth email, password hashes, tokens, and administrative attributes remain in Supabase Auth and are never projected into application tables.

## Tables and ownership

| Table | Purpose | Client visibility/write boundary |
|---|---|---|
| `profiles` | Approved discovery/profile fields | Authenticated users can read their own row or eligible, completed, non-blocked profiles; owner inserts/updates |
| `profile_private` | DOB and precise location | Owner only |
| `profile_photos` | Metadata/path for profile images | Visible when the associated profile is visible; owner writes |
| `interests` | Controlled interest catalog | Authenticated read-only |
| `profile_interests`, `profile_languages` | Public profile tags | Visible with profile; owner writes |
| `user_preferences` | Age/distance/gender/language filters | Owner only |
| `saved_profiles` | Private bookmarks | Owner only; target must currently be viewable |
| `swipes` | One current `like`/`pass` per directed pair | Actor reads; writes only through `record_swipe` |
| `matches` | Canonical mutual pair and active/unmatched state | Pair participants read unless blocked; writes only through RPC/server |
| `messages` | Idempotent match messages | Participants read history while not blocked; inserts require active match |
| `calls` | Call-session audit/state | Participants read history while not blocked; creation through `start_call`; media service owns later status |
| `blocks` | Private blocker list | Blocker reads/deletes; creation through `block_user` |
| `reports` | Private safety report | Reporter inserts/reads only; reported user cannot read |

Gender/language preferences use small arrays in a single owner-controlled row because they are replaced atomically and do not need independent lifecycle metadata. Interests remain normalized because they use a controlled reusable catalog.

## Match and state decisions

- Pair order is canonical: `user_low_id < user_high_id`; a unique constraint prevents duplicate matches.
- `record_swipe` obtains an advisory transaction lock for the canonical pair before updating the directed swipe. Two simultaneous likes serialize: the second transaction observes the first committed like and creates exactly one match.
- A duplicate like is idempotent and returns the existing active match.
- Swipes are current state, not event history. A pass replaces the actor’s prior directed state before a match exists.
- Unmatch is terminal for a pair in BASE. The existing canonical row becomes `unmatched`; a later swipe cannot reactivate or create a second row. Rematch requires a future product decision/migration.
- After unmatch, the two participants may read existing message/call history but cannot create new messages/calls. After either direction blocks, profile, match, message, and call history are hidden from client reads; records remain for integrity/safety workflows.
- `block_user` inserts the block and unmatches an active pair in one database transaction.
- Clients cannot mark a call `connected`; the LiveKit/server boundary planned for Q06 owns media-confirmed transitions.

## Storage

`profile-photos` is a private bucket limited to JPEG/PNG/WebP and 5 MiB per object. Paths must be `<owner_uuid>/<object_name>`. The owner can upload/update/delete their folder. Authenticated download requires both a `profile_photos` row and permission to view the associated profile. Clients should use authenticated downloads or short-lived signed URLs; no public bucket URL is assumed.

Database metadata and object upload are separate operations. The service layer must compensate for partial failure (delete an uploaded object when metadata insert fails, and retry object cleanup after metadata deletion). Cleanup is not claimed implemented in Q03.

## Functions and grants

Public RPCs are `record_swipe`, `unmatch`, `block_user`, and `start_call`. They take actor identity only from `auth.uid()`, are `SECURITY DEFINER` with an empty `search_path`, schema-qualify relations, revoke default `PUBLIC`/`anon` execution, and grant only `authenticated` execution.

Private authorization helpers live in non-exposed schema `private`; RLS policies call them to avoid recursive policies. Every application table enables RLS, removes default `anon`/`authenticated` privileges, and receives explicit minimum grants. There is no `USING (true)` policy on messages, calls, matches, blocks, reports, or private profile data.

## Migration and test commands

After installing Supabase CLI and starting Docker Desktop:

```powershell
supabase init                    # only if config.toml is still absent
supabase start
supabase db reset
supabase test db
supabase db lint
supabase gen types typescript --local > heartsync/src/shared/types/database.types.ts
```

Do not run `supabase db push` or link a remote project until the migrations and the open product decisions are reviewed. Generate `database.types.ts` only after the schema has actually applied; Q03 supplies handwritten contracts instead.

## Required review before remote apply

1. Confirm the public profile field list and whether gender/public location should remain visible to every eligible authenticated user.
2. Confirm terminal unmatch/no-rematch behavior for BASE.
3. Confirm read-only history after unmatch and hidden history after block.
4. Confirm 5 MiB/photo and up-to-9-photo limits.
5. Confirm report retention/admin review requirements; no admin actor or dashboard is introduced in BASE.
