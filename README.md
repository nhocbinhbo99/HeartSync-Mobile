# HeartSync Mobile

HeartSync is an Android-first dating application built with Expo SDK 58, React Native, TypeScript, Supabase, and a LiveKit development-build scaffold. The Expo application lives in `heartsync/`; migrations, Edge Function template, and project documentation live at the repository root.

## Current status

**Milestone: `BASE_READY_FOR_PARALLEL_WORK`; release state: `BASE_RELEASED_WITH_BLOCKERS`.** Q00–Q02 and Q04–Q08 are complete at their documented code/offline scope. Q03 remains `SQL_PREPARED_NOT_APPLIED`, so real discovery, match and chat data are **not working yet**. Cloud auth needs a development Supabase project and Android proof. LiveKit packages/config/token scaffold compile and bundle, but Audio/Video Call is **not working/verified** until a development APK and two physical devices connect real media.

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

Latest local gate: TypeScript PASS, ESLint PASS, Jest **14 suites / 53 tests PASS**, Expo Doctor **20/20**, Android prebuild and Hermes export PASS. PostgreSQL/RLS, Edge Function runtime, EAS APK and physical-device tests remain blocked/manual. `npm audit` reports 13 low / 3 high / 0 critical; no breaking `--force` fix was applied.

Use Expo Development Build for stable auth callbacks and native calling dependencies. Expo Go is not acceptance evidence for password recovery, Audio Call, or Video Call.

## Supabase development setup

1. Create a development project in the [Supabase dashboard](https://supabase.com/dashboard), choosing the closest available region to the intended users.
2. In **Connect**, copy the Project URL and publishable key. Never use a `service_role`/secret key in the mobile app.
3. Copy `heartsync/.env.example` to `heartsync/.env` and replace both placeholders. The local `.env` is ignored by Git.
4. In **Authentication → URL Configuration**, add both `heartsync://auth/callback` and `heartsync://auth/recovery` to Additional Redirect URLs. Confirm the Email provider and email-confirmation policy under **Authentication → Providers**.
5. Restart Metro after changing environment variables. A development build is required for a stable `heartsync://` callback.

Without these variables, HeartSync intentionally displays a setup-required screen instead of throwing or connecting with fake credentials.

Progress and blockers are tracked in [`docs/codex/QUEUE_STATUS.md`](docs/codex/QUEUE_STATUS.md). Manual steps are tracked in [`docs/codex/MANUAL_ACTIONS.md`](docs/codex/MANUAL_ACTIONS.md). Final base changes are summarized in [`docs/BASE_RELEASE_NOTES.md`](docs/BASE_RELEASE_NOTES.md).

The Q03 schema is documented in [`DATA_MODEL.md`](DATA_MODEL.md). Its status is **SQL_PREPARED_NOT_APPLIED**: migrations and pgTAP cases are reviewable, but no local/remote database has applied them yet.

## Team entry points

- Công — auth, profile, photos, preferences/saved and database review.
- Minh — discovery deck, filters, swipe/match and match-found flow.
- Hảo — matches, realtime chat, message dedupe and audio/video call flow.

Start with [`docs/TEAM_HANDOFF.md`](docs/TEAM_HANDOFF.md), then follow [`docs/SETUP_MANUAL.md`](docs/SETUP_MANUAL.md). Architecture/data contracts are indexed by [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md); product and UI direction are in [`PRODUCT.md`](PRODUCT.md) and [`DESIGN.md`](DESIGN.md).
