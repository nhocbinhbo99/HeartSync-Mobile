$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$seedPath = Join-Path $repoRoot 'supabase/manual/seed_synthetic_demo_profiles.sql'
$configPath = Join-Path $repoRoot 'supabase/config.toml'
$seed = Get-Content -Raw $seedPath
$config = Get-Content -Raw $configPath

$expectedAddresses = @(
  'ex1@gmail.com',
  'ex2@gmail.com',
  'ex3@gmail.com'
)

foreach ($address in $expectedAddresses) {
  if ($seed.IndexOf($address, [System.StringComparison]::Ordinal) -lt 0) {
    throw "Missing expected synthetic address: $address"
  }
}

if ($seed -match '(?is)insert\s+into\s+auth\.users') {
  throw 'The manual profile seed must never create Auth users.'
}

if ($seed -notmatch '(?is)email_confirmed_at\s+is\s+not\s+null') {
  throw 'The seed must require three email-confirmed Auth users.'
}

if ($seed -match '(?is)on\s+conflict\s*\([^)]*\)\s+do\s+update\s+do\s+nothing') {
  throw 'Invalid ON CONFLICT syntax: DO UPDATE cannot precede DO NOTHING.'
}

if ($seed -notmatch '(?is)on\s+conflict\s*\(slug\)\s+do\s+nothing') {
  throw 'The interests insert must be re-runnable without overwriting labels.'
}

if ($seed -match '(?i)(password\s*=|password\s*:)') {
  throw 'The seed must not contain a password literal.'
}

if ($config -notmatch '(?ms)^\[db\.seed\].*?^enabled = false') {
  throw 'The manual cloud seed must remain disabled for local db reset.'
}

Write-Output 'PASS: manual synthetic demo seed static checks'
