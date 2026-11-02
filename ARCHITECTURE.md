# HeartSync Architecture and Contracts

Status: Q04 contract baseline. The SQL in `supabase/migrations/` is **SQL_PREPARED_NOT_APPLIED**. Types in `heartsync/src/shared/types/domain.types.ts` are handwritten domain contracts, not generated Supabase database types.

## Dependency direction

```text
screen / feature UI
  -> repository or gateway interface (src/services/contracts.ts)
    -> Supabase / Realtime / media adapter
      -> authenticated RPC, table policy, Edge Function, or media provider
```

Screens must not call Supabase tables, RPCs, Realtime channels, or LiveKit directly. Domain helpers under `src/shared/domain/` contain deterministic rules and have no network dependency. Adapters translate transport details into `Result<T>` and the stable `ApiErrorCode` union.

## Ownership and boundaries

| Boundary | Interface | Primary owner | Rule |
|---|---|---|---|
| session | `AuthRepository` | Công | PKCE/session lifecycle; never expose stored tokens to UI |
| public/private profile | `ProfileRepository` | Công | DOB and exact coordinates stay private; UI receives derived `age` |
| candidate deck | `DiscoveryRepository` | Minh | validate filters before query; no hidden mock fallback |
| swipe/match | `MatchRepository` | Minh | only `record_swipe` may create a match |
| message/realtime | `ChatRepository` | Hảo | scope by `matchId`; RLS remains authoritative; dedupe server and client IDs |
| media | `CallGateway` | Hảo | request short-lived grant server-side; `connected` requires real media event |

Shared contracts and error codes require review by all owners before an incompatible change. `src/services/demo/demoData.ts` is `DEMO_ONLY`; production adapters must return an explicit error instead of using fixtures.

## Domain and RPC contracts

### `record_swipe(target, action)`

The client calls `public.record_swipe(p_target_id, p_action)`. Its parsed result is discriminated:

- `{ outcome: 'liked', matchId: null }`
- `{ outcome: 'passed', matchId: null }`
- `{ outcome: 'matched', matchId: string }`

Only the database function may insert `matches`. A `matched` result without a non-empty server `match_id` is rejected as `conflict`; the client must not show a match-found screen. Duplicate or crossed likes are serialized and made idempotent by the Q03 function and canonical pair constraint, subject to executing the pending database tests.

### Match safety RPCs

- `unmatch(p_match_id)` makes the relationship terminal under the current base policy.
- `block_user(p_target_id)` prevents future active interaction and hides history from the blocked pair.
- Screens never update `matches` directly.

### Chat

Every operation is scoped by `matchId` and the Supabase access token. The database RLS policy must still verify active membership. `clientMessageId` supports optimistic delivery; merge logic deduplicates by both server `id` and `clientMessageId`. A Realtime event is transport evidence, not authorization evidence.

### Calls

`start_call(p_match_id, p_type)` creates only the application call record. A later trusted Supabase Edge Function must validate JWT, active match and participant identity before signing a short-lived LiveKit grant. API secrets never exist in the Expo bundle. State becomes `connected` only after a media SDK callback produces `media_connected`; accepting a call or receiving a token is insufficient.

## Error and UI contract

| Code | Meaning | Typical UI response | Retry |
|---|---|---|---|
| `unauthorized` | session missing/expired | return to sign-in after preserving safe draft state | after sign-in |
| `forbidden` | authenticated but RLS/business rule denies | explain unavailable action | no automatic retry |
| `network` | offline/timeout/transport failure | retain content and show retry | yes |
| `validation` | local or server input failure | attach error to the relevant field | after edit |
| `not_found` | resource absent or no longer visible | empty/not-available state | no |
| `conflict` | stale state, duplicate or malformed invariant | refresh affected resource | once after refresh |
| `rate_limited` | server throttling | wait and expose retry later | yes, delayed |

Provider/SQL error text is diagnostic data and must not be displayed directly. Loading, empty, and error states are separate: an empty successful page is not an error, and stale content may remain visible during a recoverable refresh.

## Verification boundary

Offline Jest tests prove deterministic age, filter, canonical pair, state transition, result parsing, message dedupe, and no-phantom-match behavior. They do **not** replace PostgreSQL/RLS tests. The prepared pgTAP suite remains blocked until a local Supabase stack or approved project can execute the migrations.
