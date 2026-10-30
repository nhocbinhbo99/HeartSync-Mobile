$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$schema = Get-Content -Raw -LiteralPath (Join-Path $root 'migrations\20261029194000_initial_schema.sql')
$security = Get-Content -Raw -LiteralPath (Join-Path $root 'migrations\20261029194100_rls_and_rpcs.sql')
$storage = Get-Content -Raw -LiteralPath (Join-Path $root 'migrations\20261029194200_profile_photo_storage.sql')
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
  $security,
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

if ($storage -notmatch "'profile-photos'[\s\S]*false[\s\S]*5242880") { throw 'Private photo bucket limits missing.' }
foreach ($case in @('anonymous users cannot read profiles', 'user A cannot change user B profile',
    'non-participant chat is denied', 'self-like is denied', 'canonical pair has exactly one match',
    'duplicate like is idempotent', 'blocked pair cannot insert', 'reported user cannot read report')) {
  if ($rlsTests -notmatch [regex]::Escape($case)) { throw "Missing SQL test case: $case" }
}

Write-Output "Static migration checks passed for $($tables.Count) RLS tables and 4 public RPCs."
Write-Output 'This is not a PostgreSQL execution test.'
