# LiveKit token function

This Q06 template is server-side only. It requires Supabase JWT verification (the default), validates the caller with `auth.getUser`, selects an active participant-visible match under RLS, and returns a five-minute room token. It never accepts caller-provided identity or room name.

Configure `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` as Edge Function secrets. Do not prefix them with `EXPO_PUBLIC_`, copy them to the mobile `.env`, or commit real values. The placeholder file is documentation only.

Local serving/deployment is blocked until Supabase CLI, applied migrations, and a user-owned LiveKit project are available. An HTTP 503 body `{ "error": "NOT_CONFIGURED" }` is intentional when server configuration is missing.
