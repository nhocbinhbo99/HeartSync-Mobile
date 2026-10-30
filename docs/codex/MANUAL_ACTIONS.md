# HeartSync Manual Actions

Do not paste credentials or secrets into chat, Git, screenshots, or these logs.

## Q00 review

- [ ] **Confirm Android application ID:** approve `com.nhocbinhbo99.heartsync` before the first EAS project link or Play Store upload. Verification: `npx expo config --type public` reports the approved `android.package`.
- [ ] **Keep the existing `.claude` deletion decision:** `mobile/.claude/settings.json` was already deleted before Q00. The rename commit preserves its baseline at `heartsync/.claude/settings.json`, while the pre-existing deletion remains unstaged. Decide separately whether that plugin setting should remain deleted.

## Later checkpoints (do not perform yet)

- [ ] Create the Supabase development project and keep URL/publishable key only in `heartsync/.env` after Q02 documents the variables.
- [ ] Review and explicitly approve SQL migrations before any remote apply in Q03/Q05.
- [ ] Create/link EAS and LiveKit projects only after Q06 compatibility review; keep LiveKit API secret server-side.
- [ ] Run acceptance tests on at least two physical Android devices before claiming Chat/Audio/Video verification.

## Q01 Android smoke test

- [ ] From `heartsync/`, run `npx expo start --dev-client` with an Android emulator or development-build device.
- [ ] After completing Q02 Supabase setup below, sign in and visit all four tabs plus Bộ lọc, Hồ sơ người dùng, Match, Chat, Chỉnh sửa hồ sơ, and An toàn.
- [ ] Verify Android system Back returns through detail screens, the auth keyboard does not cover inputs/actions, and content does not overlap status/navigation bars.
- [ ] Repeat with Android font size at the largest practical setting and TalkBack enabled. Record screenshots/logcat only if they contain no personal data or credentials.

## Q02 Supabase development setup

- [ ] In [Supabase Dashboard](https://supabase.com/dashboard), create a **development** project in the closest available region to intended users. Do not use a production/shared database for this queue.
- [ ] Open the project **Connect** panel. Copy only Project URL and publishable key into a new local `heartsync/.env`, using `heartsync/.env.example` as the template. Never put `service_role`, `sb_secret`, database password, or a LiveKit secret in the app.
- [ ] Open **Authentication → Providers → Email** and review whether email confirmation is enabled. Record the choice for team QA.
- [ ] Open **Authentication → URL Configuration → Additional Redirect URLs** and add exactly `heartsync://auth/callback` (confirmation) and `heartsync://auth/recovery` (password reset) for the development build.
- [ ] Restart Metro with `npx expo start --dev-client`. Verify: sign-up (18+ confirmation), email confirmation if enabled, sign-in failure, sign-in success, app restart/session restore, sign-out, reset email, callback, and password update.
- [ ] Mark Q02 cloud evidence complete only after testing on a development-build Android target; Expo Go does not provide the stable callback evidence required here.

## Q03 local SQL review and execution

- [ ] Review `DATA_MODEL.md` and approve: exact public profile fields, terminal unmatch/no-rematch, read-only history after unmatch, hidden history after block, and photo limits.
- [ ] Start Docker Desktop and wait until the Linux engine reports healthy. Install the Supabase CLI from its official installation method; do not run an unreviewed download-and-execute pipe.
- [ ] From the repository root, initialize local Supabase config only if absent, then run `supabase start`, `supabase db reset`, `supabase test db`, and `supabase db lint`.
- [ ] After a successful local reset, generate types with `supabase gen types typescript --local` and replace/augment the clearly handwritten contract. Do not label types as generated before this succeeds.
- [ ] Review every migration and local test result before linking a remote project. A later remote `db push` requires explicit approval for that exact development project; never apply these prepared migrations to production/shared data by assumption.

## Q04 contract review

- [ ] Công, Minh, and Hảo review `ARCHITECTURE.md` plus `heartsync/src/services/contracts.ts`; agree before changing a shared interface or error code.
- [ ] Confirm the base business policy: unmatch is terminal/no-rematch, blocked pairs cannot see history, profile age is derived server-side while exact DOB remains private, and call UI is not connected until the media SDK confirms it.
- [ ] When implementing feature UI, inject repository/gateway interfaces. Do not import Supabase/Realtime/LiveKit directly from screens and do not add a production fallback to `DEMO_ONLY_PROFILES`.

## Q05 team/cloud handoff

- [ ] Record the development Supabase project reference and selected **Region** in the private team channel; put only URL and publishable key in local `heartsync/.env` files.
- [ ] After local migration review/tests pass and the exact development target is approved, apply migrations using the team's documented workflow and save non-secret command output.
- [ ] Create at least three synthetic test users A/B/C (18+) to verify dual-like matching, non-match chat denial, unmatch, block, and report privacy. Do not use personal identities.
- [ ] Add synthetic/license-safe demo images to the private development bucket only after storage policies execute; never commit real-person images.
- [ ] If proceeding with LiveKit, create a Cloud project in Q06 and keep URL/API credentials server-side. Never place its API secret in Expo public variables.
- [ ] Log in/link EAS only after confirming `com.nhocbinhbo99.heartsync`; build/install a development APK and retain quota/build URL privately.
- [ ] Invite project/repository collaborators, confirm each invitation is accepted, create the agreed feature branches/issues, and enable pull-request protection plus required typecheck/lint/test checks for `main`.
- [ ] Follow `docs/SETUP_MANUAL.md` and record Android/cloud evidence without secrets or personal data.

## Q06 LiveKit/EAS proof

- [ ] Create a user-owned LiveKit Cloud development project; configure `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` only as Supabase Edge Function secrets.
- [ ] After Q03 migrations/RLS pass, serve and test `livekit-token` locally with signed-in users A/B/C: active participant allowed; non-member, unmatched, blocked, missing JWT, and missing config denied.
- [ ] Review the exact development Supabase target, then deploy the function with JWT verification enabled. Do not use `--no-verify-jwt`.
- [ ] Confirm Android application ID and EAS project, then run `npx eas-cli build --profile development --platform android`; install the APK on two physical devices.
- [ ] On both devices, verify deny/grant behavior for microphone and camera; video turns camera on only after the video call action and permission.
- [ ] Complete bidirectional audio and video with remote tracks visible/audible, background/foreground, hang-up, network loss, unmatch, and block. Only then may Audio/Video Call be marked working.

## Q07 release-blocker audit follow-up

- [ ] Treat Q03 local reset/lint/pgTAP as the first security blocker; save evidence for all 17 cases before any shared development deployment.
- [ ] Add/review a server discovery projection/RPC that derives age from private DOB without granting the client access to DOB or precise coordinates.
- [ ] Configure and test Supabase Realtime publication only for required chat data; verify unsubscribe on route change/unmatch/block and A/B/C denial cases.
- [ ] Track a compatible Expo SDK 58 fix for the current Zod/CLI audit chain. Do not accept the proposed Expo 51 or Jest 25 downgrade.
