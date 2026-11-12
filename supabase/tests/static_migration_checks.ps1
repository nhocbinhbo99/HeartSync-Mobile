$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$schemaPath = Join-Path $repoRoot 'db\heartsync_schema.sql'
if (-not (Test-Path -LiteralPath $schemaPath)) {
  throw "Missing consolidated database schema: $schemaPath"
}

$sql = Get-Content -Raw -LiteralPath $schemaPath
$rlsTests = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'rls_security.sql')

$tables = @(
  'profiles', 'profile_private', 'profile_photos', 'interests', 'profile_interests',
  'profile_languages', 'user_preferences', 'saved_profiles', 'swipes', 'matches',
  'messages', 'calls', 'blocks', 'reports', 'ai_quota_buckets'
)

foreach ($table in $tables) {
  if ($sql -notmatch "create table public\.$table\s*\(") { throw "Missing table: $table" }
  if ($sql -notmatch "alter table public\.$table enable row level security") { throw "RLS not enabled: $table" }
  if ($sql -notmatch "revoke all on table[\s\S]*public\.$table[\s\S]*from (?:public,\s*)?anon, authenticated") {
    throw "Explicit grants not revoked: $table"
  }
}

if ($sql -match 'using\s*\(\s*true\s*\)') { throw 'Unconditional USING (true) policy found.' }

$functionBlocks = [regex]::Matches(
  $sql,
  'create or replace function[\s\S]*?\$\$;',
  [Text.RegularExpressions.RegexOptions]::IgnoreCase
)
foreach ($block in $functionBlocks) {
  if ($block.Value -match 'security definer' -and $block.Value -notmatch "set search_path = ''") {
    throw 'SECURITY DEFINER function without empty search_path.'
  }
}

$publicRpcs = @(
  'record_swipe', 'unmatch', 'block_user', 'start_call', 'call_heartbeat',
  'save_my_profile', 'save_my_private_location', 'save_my_preferences',
  'reorder_profile_photos', 'set_primary_profile_photo', 'list_saved_profiles',
  'reserve_ai_request', 'finalize_ai_request', 'fail_ai_request',
  'get_ai_quotas', 'ai_icebreaker_context'
)
foreach ($rpc in $publicRpcs) {
  if ($sql -notmatch "revoke all on function public\.$rpc\([^\)]*\)\s+from public, anon") {
    throw "RPC execute not revoked from public/anon: $rpc"
  }
  if ($sql -notmatch "grant execute on function public\.$rpc\([^\)]*\)\s+to authenticated") {
    throw "RPC execute not granted to authenticated: $rpc"
  }
}

foreach ($fragment in @(
  'create table private.ai_generation_requests',
  'create policy ai_quota_buckets_select_own',
  'private.ai_period_key',
  'Asia/Ho_Chi_Minh',
  'reserved_count',
  'REQUEST_EXPIRED',
  'caller_heartbeat_at',
  'callee_heartbeat_at',
  "interval '90 seconds'",
  "'audio'::public.call_type",
  "'video'::public.call_type",
  "period_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'",
  "notify pgrst, 'reload schema'"
)) {
  if ($sql -notmatch [regex]::Escape($fragment)) { throw "Missing database schema invariant: $fragment" }
}

if ($sql -match 'grant\s+(all|insert|update|delete)\s+on table public\.ai_quota_buckets\s+to authenticated') {
  throw 'Authenticated clients must not be granted AI quota mutations.'
}

$reorderMatch = [regex]::Match(
  $sql,
  'create or replace function public\.reorder_profile_photos[\s\S]*?\$\$;',
  [Text.RegularExpressions.RegexOptions]::IgnoreCase
)
if (-not $reorderMatch.Success) {
  throw 'Missing reorder_profile_photos function.'
}
if ($reorderMatch.Value -match '(?mi)^\s*set\s+constraints\b') {
  throw 'reorder_profile_photos must rely on the DEFERRABLE INITIALLY DEFERRED unique constraint, not SET CONSTRAINTS.'
}

if ($sql -notmatch "'profile-photos'[\s\S]*false[\s\S]*5242880") { throw 'Private photo bucket limits missing.' }
foreach ($case in @('anonymous users cannot read profiles', 'user A cannot change user B profile',
    'non-participant chat is denied', 'self-like is denied', 'canonical pair has exactly one match',
    'duplicate like is idempotent', 'blocked pair cannot insert', 'reported user cannot read report',
    'owner can atomically save public and private profile fields', 'public profile projection excludes private fields',
    'a seventh photo order is rejected', 'saved profile RPC returns only the owner list')) {
  if ($rlsTests -notmatch [regex]::Escape($case)) { throw "Missing SQL test case: $case" }
}

Write-Output "Static schema checks passed for $($tables.Count) RLS tables and $($publicRpcs.Count) public RPCs."
Write-Output 'This is not a PostgreSQL execution test.'
