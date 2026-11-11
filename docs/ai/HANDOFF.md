# Handoff — HeartSync Gemini AI

## Source handoff

| Path | Purpose |
|---|---|
| `heartsync/src/shared/domain/ai.ts` | Shared mobile request/result/quota validators. |
| `heartsync/src/services/aiAssistantRepository.ts` | Client service boundary for the Edge Function. |
| `heartsync/src/features/ai/AiBioAssistant.tsx` | Consent, quota, preview and opt-in Bio UX. |
| `heartsync/src/features/ai/AiIcebreakerAssistant.tsx` | Consent, quota and 3-suggestion composer-fill UX. |
| `supabase/migrations/20261111110000_heartsync_ai_quota.sql` | DB schema, RLS and quota/authz RPCs. |
| `supabase/functions/ai-assistant/index.ts` | Authenticated Function handler. |
| `supabase/functions/ai-assistant/gemini.ts` | Gemini REST structured-output helper/testable validator. |
| `supabase/tests/ai_quota.sql` | pgTAP integration test, pending Docker. |

## Function contract

`POST ai-assistant` with Supabase user session:

- `{ action: 'get_quota' }` → `{ profile_bio, icebreaker }`.
- `{ action: 'generate_bio', request_id, tone: 'natural'|'playful'|'sincere', language: 'vi', user_ideas }` → one `suggestion` and `quota`.
- `{ action: 'generate_icebreaker', request_id, match_id, tone: 'friendly', language: 'vi' }` → three `suggestions` and `quota`.

Only Function Secrets may hold `GEMINI_API_KEY`; `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite`. The Function must remain user-JWT protected. Error codes are `UNAUTHENTICATED`, `INVALID_INPUT`, `MATCH_NOT_ALLOWED`, `AI_QUOTA_EXHAUSTED`, `GEMINI_RATE_LIMITED`, `AI_TEMPORARILY_UNAVAILABLE`, `AI_OUTPUT_INVALID`, and `REQUEST_IN_PROGRESS`.

The mobile disclosure acknowledgement is keyed by signed-in user and feature only as a UX preference; it never authorizes generation or determines quota. Network/`REQUEST_IN_PROGRESS` retry keeps the same request UUID, while a fresh generation after a known provider failure receives a new UUID.

## Current delivery status

Implementation source, static tests, mobile lint/typecheck and Jest regression pass. The delivery is **not release-validated** until the owner runs local pgTAP/Deno, supplies server secret, reviews/applies migration, deploys only after approval, and records two-account Android/live-Gemini evidence. No remote state was changed by this work.
