$ErrorActionPreference = 'Stop'

$functionPath = Join-Path $PSScriptRoot '..\functions\livekit-token\index.ts'
$configPath = Join-Path $PSScriptRoot '..\config.toml'
$source = Get-Content -Raw -LiteralPath $functionPath
$config = Get-Content -Raw -LiteralPath $configPath
$required = [ordered]@{
  'validated user JWT' = 'auth\.getUser\(token\)'
  'accepted call lookup' = '\.eq\("status", "accepted"\)'
  'active match check' = 'match\?\.status !== "active"'
  'call type matches request' = 'call\.type !== body\.callType'
  'participant authorization' = 'call\.caller_id !== authData\.user\.id && call\.callee_id !== authData\.user\.id'
  'room derived from call' = 'roomName = `call:\$\{call\.id\}`'
  'microphone publish source' = 'TrackSource\.MICROPHONE'
  'camera restricted to video' = 'body\.callType === "video"[\s\S]*?TrackSource\.CAMERA'
  'five minute TTL' = 'ttlSeconds = 5 \* 60'
  'server secret read' = 'Deno\.env\.get\("LIVEKIT_API_SECRET"\)'
  'runtime publishable keys read' = 'Deno\.env\.get\("SUPABASE_PUBLISHABLE_KEYS"\)'
  'legacy runtime key fallback' = 'Deno\.env\.get\("SUPABASE_ANON_KEY"\)'
  'explicit not configured response' = "NOT_CONFIGURED"
}

foreach ($entry in $required.GetEnumerator()) {
  if ($source -notmatch $entry.Value) { throw "Missing LiveKit security check: $($entry.Key)" }
}
if ($source -match 'EXPO_PUBLIC_|callerIdentity|callerRoom') {
  throw 'Edge Function contains a forbidden client/public secret or caller-controlled room/identity marker.'
}
if ($source -match 'Deno\.env\.get\("SUPABASE_PUBLISHABLE_KEY"\)') {
  throw 'Edge Function must use runtime-injected Supabase API keys, not a custom reserved-prefix secret.'
}
if ($config -notmatch '(?ms)\[functions\.livekit-token\]\s*(?:#.*\s*)*verify_jwt\s*=\s*false') {
  throw 'livekit-token must use in-function JWT validation for the project asymmetric Auth signing keys.'
}

Write-Output "PASS: $($required.Count) LiveKit Edge Function security patterns found. This is static review, not deployment or media evidence."
