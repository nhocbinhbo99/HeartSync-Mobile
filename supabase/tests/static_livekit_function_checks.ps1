$ErrorActionPreference = 'Stop'

$functionPath = Join-Path $PSScriptRoot '..\functions\livekit-token\index.ts'
$source = Get-Content -Raw -LiteralPath $functionPath
$required = [ordered]@{
  'validated user JWT' = 'auth\.getUser\(token\)'
  'active match lookup' = "\.eq\('status', 'active'\)"
  'both participants checked' = 'match\.user_low_id.*match\.user_high_id'
  'room derived from match' = 'roomName = `match:\$\{match\.id\}`'
  'five minute TTL' = 'ttlSeconds = 5 \* 60'
  'server secret read' = "Deno\.env\.get\('LIVEKIT_API_SECRET'\)"
  'explicit not configured response' = "NOT_CONFIGURED"
}

foreach ($entry in $required.GetEnumerator()) {
  if ($source -notmatch $entry.Value) { throw "Missing LiveKit security check: $($entry.Key)" }
}
if ($source -match 'EXPO_PUBLIC_|callerIdentity|callerRoom') {
  throw 'Edge Function contains a forbidden client/public secret or caller-controlled room/identity marker.'
}

Write-Output "PASS: $($required.Count) LiveKit Edge Function security patterns found. This is static review, not deployment or media evidence."
