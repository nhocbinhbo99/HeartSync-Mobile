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
