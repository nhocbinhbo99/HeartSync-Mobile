# HeartSync Mobile

HeartSync is an Android-first dating application built with Expo SDK 58, React Native, and TypeScript. The Expo application lives in `heartsync/`; database migrations and project documentation stay at the repository root.

## Current status

Q00 establishes the verified baseline and naming. Q01 adds the typed navigation/theme shell. Q02 adds an offline-tested Supabase auth foundation, SQLite-backed session persistence, guarded routes, and password-recovery deep links. Cloud authentication is still manual-required until a real development project and redirect allowlist are configured. Supabase domain data, realtime chat, and LiveKit calling must not be treated as working until their later checkpoints.

## Local baseline commands

```powershell
cd heartsync
npm ci
npm run typecheck
npm run lint
npm test -- --ci
npx expo-doctor
npx expo start --dev-client
```

Use Expo Development Build for stable auth callbacks and native calling dependencies. Expo Go is not acceptance evidence for password recovery, Audio Call, or Video Call.

## Supabase development setup

1. Create a development project in the [Supabase dashboard](https://supabase.com/dashboard), choosing the closest available region to the intended users.
2. In **Connect**, copy the Project URL and publishable key. Never use a `service_role`/secret key in the mobile app.
3. Copy `heartsync/.env.example` to `heartsync/.env` and replace both placeholders. The local `.env` is ignored by Git.
4. In **Authentication → URL Configuration**, add both `heartsync://auth/callback` and `heartsync://auth/recovery` to Additional Redirect URLs. Confirm the Email provider and email-confirmation policy under **Authentication → Providers**.
5. Restart Metro after changing environment variables. A development build is required for a stable `heartsync://` callback.

Without these variables, HeartSync intentionally displays a setup-required screen instead of throwing or connecting with fake credentials.

Progress and blockers are tracked in [`docs/codex/QUEUE_STATUS.md`](docs/codex/QUEUE_STATUS.md). Manual steps are tracked in [`docs/codex/MANUAL_ACTIONS.md`](docs/codex/MANUAL_ACTIONS.md).

The Q03 schema is documented in [`DATA_MODEL.md`](DATA_MODEL.md). Its status is **SQL_PREPARED_NOT_APPLIED**: migrations and pgTAP cases are reviewable, but no local/remote database has applied them yet.
