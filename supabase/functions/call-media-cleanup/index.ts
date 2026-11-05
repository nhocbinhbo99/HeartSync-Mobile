import { createClient } from "npm:@supabase/supabase-js@2";
import { RoomServiceClient } from "npm:livekit-server-sdk@2";
// Server scheduler only. Configure a Vault-backed secret, never EXPO_PUBLIC_*.
Deno.serve(async (request) => {
  const secret = Deno.env.get("CALL_CLEANUP_SECRET");
  if (!secret || request.headers.get("Authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL"),
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const host = Deno.env.get("LIVEKIT_URL"),
    apiKey = Deno.env.get("LIVEKIT_API_KEY"),
    apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
  if (!url || !key || !host || !apiKey || !apiSecret)
    return new Response("Not configured", { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false } });
  const media = new RoomServiceClient(
    host.replace(/^ws/, "http"),
    apiKey,
    apiSecret,
  );
  const { data, error } = await db.rpc("pending_call_cleanup");
  if (error) return new Response("Queue unavailable", { status: 503 });
  let pending = 0;
  for (const call of data ?? []) {
    try {
      for (const identity of [call.caller_id, call.callee_id]) {
        try {
          await media.removeParticipant(`call:${call.call_id}`, identity);
        } catch (e) {
          if (!(
            e &&
            typeof e === "object" &&
            "status" in e &&
            e.status === 404
          ))
            throw e;
        }
      }
      const { error: ack } = await db.rpc("ack_call_cleanup", {
        p_call_id: call.call_id,
      });
      if (ack) pending++;
    } catch {
      pending++;
    }
  }
  return Response.json(
    { processed: (data?.length ?? 0) - pending, pending },
    { status: pending ? 503 : 200 },
  );
});
