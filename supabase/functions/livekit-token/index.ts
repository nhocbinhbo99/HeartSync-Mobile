import { createClient } from 'npm:@supabase/supabase-js@2';
import { AccessToken } from 'npm:livekit-server-sdk@2';

type RequestBody = { callId?: unknown; callType?: unknown };

const headers = { 'Content-Type': 'application/json' };
const respond = (status: number, body: object) => Response.json(body, { status, headers });

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return respond(405, { error: 'METHOD_NOT_ALLOWED' });

  const authHeader = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const liveKitUrl = Deno.env.get('LIVEKIT_URL');
  const liveKitApiKey = Deno.env.get('LIVEKIT_API_KEY');
  const liveKitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');
  if (!supabaseUrl || !publishableKey || !liveKitUrl || !liveKitApiKey || !liveKitApiSecret) {
    return respond(503, { error: 'NOT_CONFIGURED' });
  }
  if (!authHeader?.startsWith('Bearer ')) return respond(401, { error: 'UNAUTHORIZED' });

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return respond(400, { error: 'INVALID_REQUEST' });
  }
  if (typeof body.callId !== 'string' || body.callType !== 'audio') {
    return respond(400, { error: 'INVALID_REQUEST' });
  }

  const callerClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const token = authHeader.slice('Bearer '.length);
  const { data: authData, error: authError } = await callerClient.auth.getUser(token);
  if (authError || !authData.user) return respond(401, { error: 'UNAUTHORIZED' });

  const { data: call, error: callError } = await callerClient
    .from('calls')
    .select('id,match_id,caller_id,callee_id,type,status,matches!inner(id,status,user_low_id,user_high_id)')
    .eq('id', body.callId)
    .eq('status', 'accepted')
    .single();
  if (
    callError ||
    !call ||
    call.type !== 'audio' ||
    call.matches.status !== 'active' ||
    (call.caller_id !== authData.user.id && call.callee_id !== authData.user.id)
  ) return respond(403, { error: 'ACTIVE_MATCH_REQUIRED' });

  const roomName = `call:${call.id}`;
  const ttlSeconds = 5 * 60;
  const grant = new AccessToken(liveKitApiKey, liveKitApiSecret, {
    identity: authData.user.id,
    ttl: ttlSeconds,
  });
  grant.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
  const accessToken = await grant.toJwt();
  return respond(200, {
    serverUrl: liveKitUrl,
    accessToken,
    roomName,
    identity: authData.user.id,
    callType: body.callType,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  });
});
