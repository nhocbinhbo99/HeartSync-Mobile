# HeartSync Team Handoff

Milestone: **BASE_READY_FOR_PARALLEL_WORK** with cloud/device/database blockers listed below. Minh and Hảo can begin UI work against typed interfaces now; they do not need to wait for LiveKit or a remote Supabase apply.

## Repository map

| Path | Purpose | Change rule |
|---|---|---|
| `heartsync/src/features/` | feature UI grouped by auth/discovery/matching/chat/calling/profile/preferences/saved | owner works inside their feature first |
| `heartsync/src/navigation/` | typed route graph and auth guard selection | coordinate any route rename |
| `heartsync/src/services/contracts.ts` | shared repository/gateway boundary | team review before breaking change |
| `heartsync/src/shared/types/` | UI/domain contracts; currently handwritten | do not call them generated DB types |
| `heartsync/src/shared/domain/` | deterministic tested business rules | add unit tests with every invariant |
| `supabase/migrations/` | prepared SQL/RLS/RPC/storage policy | review and local-test before remote apply |
| `supabase/tests/` | static gate and pgTAP security cases | client tests do not replace these |
| `docs/codex/` | queue evidence, blockers and manual checklist | update with actual evidence only |

Dependency direction is screen → repository/gateway interface → adapter → authenticated backend/media provider. Screens must not import Supabase, Realtime, or LiveKit directly. `DEMO_ONLY_PROFILES` is preview/test data only and must never become a production fallback.

## Routes and shared states

Tabs: `Discover`, `Saved`, `Matches`, `Profile`.

Stack routes: `SignIn`, `SignUp`, `ForgotPassword`, `UpdatePassword`, `AuthLoading`, `SetupRequired`, `MainTabs`, `EditProfile`, `Filters`, `OtherProfile`, `Chat`, `AudioCall`, `VideoCall`, `MatchFound`, and `Safety`.

Navigation params are declared in `heartsync/src/navigation/types.ts`. Use existing shared loading/empty/error components and stable `ApiErrorCode` values. An empty successful page is not an error; a `matched` screen requires the server-confirmed `matchId`; a call becomes `connected` only from real media callback.

## Commands and environment

From `heartsync/`:

```powershell
npm ci
npm run typecheck
npm run lint
npm test -- --ci
npx expo-doctor
npx expo start --dev-client
```

Copy `.env.example` to ignored `.env` and set only `EXPO_PUBLIC_SUPABASE_URL` plus `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Follow `docs/SETUP_MANUAL.md` for redirects, local migrations, EAS and Android evidence.

## Backend readiness and UI-while-waiting policy

- Q03 migrations, RLS and pgTAP are prepared, not executed. Do not claim real discovery/chat security before local/remote tests pass.
- UI work may use the typed interfaces and explicit `DEMO_ONLY` fixtures in Storybook-like previews/tests. Production builds must surface `SetupRequired`, empty, or typed error states instead of silently switching to fixtures.
- The Q04 match adapter calls only the atomic `record_swipe` RPC. Do not insert a match client-side.
- Chat work must carry `matchId`, use authenticated access, unsubscribe on unmount/match change, and dedupe both server `id` and `clientMessageId`.
- Call work must request a short-lived grant from a trusted Edge Function. No client-side token signing.

## Ownership and proposed GitHub issues

The following issue bodies are copy-ready. They are proposals only; no remote issue or branch was created.

### Công — `feat/auth`

**Scope:** Connect existing auth foundation to the approved development project; test sign-up/confirmation/sign-in/restore/reset/sign-out on Android. **Depends on:** Supabase URL/publishable key and redirects. **Acceptance:** typed errors, no raw provider text, device evidence, tests updated.

### Công — `feat/profile`

**Scope:** Implement public/private profile forms and private photo upload using `ProfileRepository`. **Depends on:** applied migrations/storage policies. **Acceptance:** DOB/coordinates never enter public DTO; photo ordering/limit/error states tested.

### Công — `feat/preferences`

**Scope:** Implement validated preferences plus saved profiles without direct table calls from screens. **Depends on:** repository adapters and RLS. **Acceptance:** 18–120 age and 1–500 km rules; loading/empty/error states.

### Minh — `feat/discovery`

**Scope:** Build responsive candidate deck and filters using `DiscoveryRepository`. **Depends on:** `ProfilePublic` and `DiscoveryFilters`. **Acceptance:** no DOB leak, empty deck state, keyboard/accessibility/device checks.

### Minh — `feat/swipe-match`

**Scope:** Like/pass gestures call `MatchRepository.recordSwipe`; show MatchFound only for confirmed result. **Depends on:** `record_swipe` migration applied and tested. **Acceptance:** rapid/duplicate swipes cannot create phantom UI or duplicate match; errors recover safely.

### Hảo — `feat/chat-realtime`

**Scope:** Matches list, message history, optimistic send, Realtime subscription lifecycle and dedupe. **Depends on:** active-match RLS and `ChatRepository` adapter. **Acceptance:** non-member denied server-side; duplicate events render once; unmatch/block closes composer/subscription.

### Hảo — `feat/call-android`

**Scope:** Audio then video flow through `CallGateway`, Edge Function grant and SDK media events. **Depends on:** Q06 compatibility decision, EAS development build, LiveKit server credentials. **Acceptance:** invalid match denied; secrets absent from bundle; two-device audio/video evidence before marking complete.

Suggested branch rule: one issue per `feat/<area>` branch, pull request into the agreed integration branch, required typecheck/lint/test checks, at least one cross-owner review for shared contracts or migrations. Do not push directly to protected `main`.

## Immediate coordination points

1. Công and the team review the Q03 privacy/history/rematch policy and execute migrations locally.
2. Minh confirms whether `ProfilePublic.age` and filter semantics satisfy card UI before adapter implementation.
3. Hảo confirms chat pagination/subscription semantics and waits for Q06 before choosing native media packages.

Remaining blockers: no real Supabase project evidence, no executed RLS tests, no Android device smoke test, no EAS-linked build, and no two-device media test.

## Kế hoạch giao việc ngay

### Công — Auth, Profile, Preferences, Saved, database gate

- **Dependencies:** development Supabase URL/publishable key, approved Q03 policy, healthy local Docker/CLI.
- **Work:** execute/review migrations and pgTAP; generate database types; finish real auth evidence; implement profile/private fields/photos/preferences/saved adapters and UI.
- **Acceptance:** all 17 RLS cases pass; DOB/coordinates never enter public DTO; photos remain private; Android auth callbacks/session restore pass; no direct screen query.
- **Coordinate:** approve generated DB types and any shared contract/migration change with Minh and Hảo before merge.

### Minh — Discovery, filter deck, swipe/match, unmatch

- **Dependencies:** Công's applied/reviewed schema plus a new RLS-safe discovery projection deriving age; existing `DiscoveryRepository`/`MatchRepository` contracts.
- **Work:** candidate cards/gestures, validated filters, like/pass via atomic RPC, confirmed MatchFound and unmatch behavior.
- **Acceptance:** self/swiped/blocked/under-18/private data excluded; rapid duplicate actions make no phantom/duplicate match; empty/error/retry/accessibility/device states pass.
- **Coordinate:** agree public card fields and pagination with Công; expose confirmed `matchId` and lifecycle events to Hảo.

### Hảo — Matches, chat Realtime, call invitations, audio + video

- **Dependencies:** active-match RLS execution, Minh's match contract, Q06 Edge Function/EAS/LiveKit setup, two physical Android devices.
- **Work:** match list; chat history/send/subscription cleanup/dedupe; call invite/accept/end persistence; LiveKit audio then video UI through `CallGateway`.
- **Acceptance:** user C/non-member denied; duplicate message events render once; unmatch/block closes chat/call; no client token signing; camera is video-only after permission; two-device bidirectional audio/video evidence.
- **Coordinate:** share subscription/call state changes with Minh and request Công review every RLS/Edge Function change.
