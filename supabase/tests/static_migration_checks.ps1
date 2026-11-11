$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$schema = Get-Content -Raw -LiteralPath (Join-Path $root 'migrations\20261029194000_initial_schema.sql')
$security = Get-Content -Raw -LiteralPath (Join-Path $root 'migrations\20261029194100_rls_and_rpcs.sql')
$storage = Get-Content -Raw -LiteralPath (Join-Path $root 'migrations\20261029194200_profile_photo_storage.sql')
$profileContracts = Get-Content -Raw -LiteralPath (Join-Path $root 'migrations\20261103120000_profile_preferences_contracts.sql')
$reorderRepair = Get-Content -Raw -LiteralPath (Join-Path $root 'migrations\20261105080739_fix_reorder_profile_photos_constraint.sql')
$callLiveness = Get-Content -Raw -LiteralPath (Join-Path $root 'migrations\20261105120000_call_liveness.sql')
$videoCall = Get-Content -Raw -LiteralPath (Join-Path $root 'migrations\20261107065833_enable_video_calls_with_liveness.sql')
$aiQuota = Get-Content -Raw -LiteralPath (Join-Path $root 'migrations\20261111110000_heartsync_ai_quota.sql')
$aiQuotaConstraintRepair = Get-Content -Raw -LiteralPath (Join-Path $root 'migrations\20261111160000_fix_ai_icebreaker_period_constraint.sql')
$rlsTests = Get-Content -Raw -LiteralPath (Join-Path $root 'tests\rls_security.sql')

$tables = @(
  'profiles', 'profile_private', 'profile_photos', 'interests', 'profile_interests',
  'profile_languages', 'user_preferences', 'saved_profiles', 'swipes', 'matches',
  'messages', 'calls', 'blocks', 'reports'
)

foreach ($table in $tables) {
  if ($schema -notmatch "create table public\.$table\s*\(") { throw "Missing table: $table" }
  if ($security -notmatch "alter table public\.$table enable row level security") { throw "RLS not enabled: $table" }
  if ($security -notmatch "revoke all on table[\s\S]*public\.$table[\s\S]*from anon, authenticated") {
    throw "Explicit grants not revoked: $table"
  }
}

if ($security -match 'using\s*\(\s*true\s*\)') { throw 'Unconditional USING (true) policy found.' }

$functionBlocks = [regex]::Matches(
  "$security`n$profileContracts`n$callLiveness",
  'create or replace function[\s\S]*?\$\$;',
  [Text.RegularExpressions.RegexOptions]::IgnoreCase
)
foreach ($block in $functionBlocks) {
  if ($block.Value -match 'security definer' -and $block.Value -notmatch "set search_path = ''") {
    throw 'SECURITY DEFINER function without empty search_path.'
  }
}

foreach ($rpc in @('record_swipe', 'unmatch', 'block_user', 'start_call')) {
  if ($security -notmatch "revoke execute on function public\.$rpc[\s\S]*from public, anon") {
    throw "RPC execute not revoked from public/anon: $rpc"
  }
  if ($security -notmatch "grant execute on function public\.$rpc[\s\S]*to authenticated") {
    throw "RPC execute not granted to authenticated: $rpc"
  }
}

if ($callLiveness -notmatch 'create or replace function public\.call_heartbeat') {
  throw 'Missing participant call heartbeat RPC.'
}
if ($callLiveness -notmatch 'caller_heartbeat_at[\s\S]*callee_heartbeat_at') {
  throw 'Missing independent caller/callee call leases.'
}
if ($callLiveness -notmatch "interval '90 seconds'") {
  throw 'Missing abandoned accepted-call lease timeout.'
}
if ($callLiveness -notmatch "revoke all on function public\.call_heartbeat\(uuid\) from public, anon") {
  throw 'call_heartbeat must be revoked from public/anon.'
}
if ($callLiveness -notmatch "grant execute on function public\.call_heartbeat\(uuid\) to authenticated") {
  throw 'call_heartbeat must be granted only to authenticated clients.'
}
if ($videoCall -notmatch "'audio'::public\.call_type[\s\S]*'video'::public\.call_type") {
  throw 'Final start_call contract must accept audio and video call types.'
}
if ($videoCall -notmatch 'caller_heartbeat_at[\s\S]*interval ''90 seconds''') {
  throw 'Video call migration must preserve participant heartbeat leases.'
}
if ($videoCall -notmatch "revoke execute on function public\.start_call\(uuid, public\.call_type\)[\s\S]*from public, anon") {
  throw 'Final start_call contract must remain revoked from public/anon.'
}

foreach ($fragment in @(
  'create table public.ai_quota_buckets',
  'create table private.ai_generation_requests',
  'alter table public.ai_quota_buckets enable row level security',
  "create policy ai_quota_buckets_select_own",
  'private.ai_period_key',
  'public.reserve_ai_request',
  'public.finalize_ai_request',
  'public.fail_ai_request',
  'public.get_ai_quotas',
  'public.ai_icebreaker_context',
  "Asia/Ho_Chi_Minh",
  "reserved_count",
  "REQUEST_EXPIRED"
)) {
  if ($aiQuota -notmatch [regex]::Escape($fragment)) { throw "Missing AI quota invariant: $fragment" }
}
if ($aiQuota -match 'grant\s+(all|insert|update|delete)\s+on table public\.ai_quota_buckets\s+to authenticated') {
  throw 'Authenticated clients must not be granted AI quota mutations.'
}
if ($aiQuota -notmatch "revoke all on function public\.reserve_ai_request[\s\S]*from public, anon") {
  throw 'AI quota RPCs must be revoked from public/anon.'
}
if ($aiQuota -notmatch "grant execute on function public\.reserve_ai_request[\s\S]*to authenticated") {
  throw 'AI quota RPCs must be granted only to authenticated callers.'
}
if ($aiQuotaConstraintRepair -notmatch 'drop constraint if exists ai_generation_request_shape') {
  throw 'AI Icebreaker period constraint repair must replace the deployed constraint forward-only.'
}
if ($aiQuotaConstraintRepair -notmatch 'drop constraint if exists ai_quota_buckets_period_key_check') {
  throw 'AI Icebreaker period constraint repair must replace the deployed quota bucket constraint forward-only.'
}
if ($aiQuotaConstraintRepair -notmatch "period_key ~ '\^\[0-9\]\{4\}-\[0-9\]\{2\}-\[0-9\]\{2\}\$'") {
  throw 'AI Icebreaker period constraint repair must accept YYYY-MM-DD using an unambiguous digit pattern.'
}
if ($aiQuotaConstraintRepair -notmatch "notify pgrst, 'reload schema'") {
  throw 'AI Icebreaker period constraint repair must reload the PostgREST schema cache.'
}
$aiFunctionBlocks = [regex]::Matches($aiQuota, 'create or replace function[\s\S]*?\$\$;', [Text.RegularExpressions.RegexOptions]::IgnoreCase)
foreach ($block in $aiFunctionBlocks) {
  if ($block.Value -match 'security definer' -and $block.Value -notmatch "set search_path = ''") {
    throw 'AI SECURITY DEFINER function without empty search_path.'
  }
}

$profileRpcs = @(
  'save_my_profile', 'save_my_private_location', 'save_my_preferences',
  'reorder_profile_photos', 'set_primary_profile_photo', 'list_saved_profiles'
)
foreach ($rpc in $profileRpcs) {
  if ($profileContracts -notmatch "revoke execute on function public\.$rpc[\s\S]*from public, anon") {
    throw "Profile RPC execute not revoked from public/anon: $rpc"
  }
  if ($profileContracts -notmatch "grant execute on function public\.$rpc[\s\S]*to authenticated") {
    throw "Profile RPC execute not granted to authenticated: $rpc"
  }
}

if ($reorderRepair -notmatch 'create or replace function public\.reorder_profile_photos') {
  throw 'Missing forward-only reorder_profile_photos repair.'
}
if ($reorderRepair -notmatch "set search_path = ''") {
  throw 'Reorder repair must retain an empty SECURITY DEFINER search_path.'
}
if ($reorderRepair -match '(?mi)^\s*set\s+constraints\b') {
  throw 'Reorder repair must rely on the DEFERRABLE INITIALLY DEFERRED unique constraint, not a search_path lookup.'
}

if ($storage -notmatch "'profile-photos'[\s\S]*false[\s\S]*5242880") { throw 'Private photo bucket limits missing.' }
foreach ($case in @('anonymous users cannot read profiles', 'user A cannot change user B profile',
    'non-participant chat is denied', 'self-like is denied', 'canonical pair has exactly one match',
    'duplicate like is idempotent', 'blocked pair cannot insert', 'reported user cannot read report',
    'owner can atomically save public and private profile fields', 'public profile projection excludes private fields',
    'a seventh photo order is rejected', 'saved profile RPC returns only the owner list')) {
  if ($rlsTests -notmatch [regex]::Escape($case)) { throw "Missing SQL test case: $case" }
}

Write-Output "Static migration checks passed for $($tables.Count) RLS tables and $((4 + $profileRpcs.Count)) public RPCs."
Write-Output 'Static AI quota migration checks passed (RLS, auth grants, timezone, reservation/finalize/refund invariants).'
Write-Output 'This is not a PostgreSQL execution test.'
