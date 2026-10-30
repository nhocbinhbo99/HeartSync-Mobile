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
