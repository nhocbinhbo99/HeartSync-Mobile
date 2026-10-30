# HeartSync Base Progress

## Current checkpoint

Milestone: **BASE_READY_FOR_PARALLEL_WORK**. Q00–Q02 and Q04–Q07 are complete at their stated code/offline level. Q03 is prepared but not applied (`SQL_PREPARED_NOT_APPLIED`). Q07 audit is complete, not a substitute for the blocked database/cloud/device tests.

| Area | Implemented | Tested locally | Tested on Android | Requires user | Next owner |
|---|---|---|---|---|---|
| Repository naming | App directory and Expo/npm identity updated | `npm ci`, TypeScript, Expo config, Expo Doctor | No | Confirm Android application ID before EAS link | Công |
| SRS/SDS comparison | 19 UC, rules, risks, and open decisions recorded | Content extraction verified | N/A | Resolve schema/history decisions | Công + team |
| Navigation shell + theme | Typed native stack, four bottom tabs, auth entry routes, detail placeholders, shared controls/states | TypeScript, ESLint, Expo Doctor, Android production bundle | No | Run visual/back/keyboard smoke test | Công |
| Auth foundation | Supabase client, SQLite session storage, lifecycle refresh, email/password flows, recovery callback, guarded routes | Jest mocked tests, TypeScript, ESLint, Expo Doctor, Android production bundle | No | Create/configure development Supabase; test real email flow | Công |
| Database schema/security | 14 tables, public/private split, RLS/grants, atomic swipe/unmatch/block/call RPCs, private photo policies, pgTAP plan | Static migration checks only | N/A | Start Docker/install CLI; reset/lint/test locally; review before remote apply | Công + team |
| Domain Data/Chat/Call contracts | Domain types, six interfaces, stable errors, atomic swipe adapter, call/message invariants | TypeScript, ESLint, Jest 13 suites/46 tests | No | Review boundary decisions; database/device integration remains pending | Công + Minh + Hảo |
| Team onboarding | Root quick start, Windows/Android/Supabase manual, ownership and copy-ready issue proposals | Commands/path/env links reviewed; Q05 QA gate below | No | Create cloud projects, test identities, branches/protection | Công + team |
| LiveKit/EAS feasibility | Exact version locks, native config plugins/permissions, bootstrap, APK profiles, typed gateway, Edge Function template | TypeScript/lint, 52 tests, Expo config, prebuild, Doctor 20/20, Android Hermes export | No | Configure server secrets, deploy, build development APK, test two devices | Hảo + Công |

## Evidence and limitations

- SRS/SDS tables and OOXML text were extracted successfully.
- All 13 PDF mockup pages were rendered and inspected.
- DOCX visual rendering is blocked by missing LibreOffice in the bundled runtime; content extraction succeeded.
- No Android device test has been run.
- No Supabase project, remote migration, EAS build, or LiveKit project has been created or changed.

## Q02 validation

- One persistence adapter only: Expo SQLite localStorage polyfill; AsyncStorage is not installed.
- `npm test -- --ci`: PASS, 5 suites / 14 tests (config, validation, callback allowlist, navigation guard, session transitions, sanitized errors, cleanup).
- `npm run typecheck` and `npm run lint`: PASS.
- `npx expo-doctor`: PASS, 20/20.
- `npx expo config --type public`: PASS; `heartsync` scheme and SQLite/Asset plugins resolved.
- Android production export: PASS, 1,015 modules bundled to 3 MB Hermes bytecode; generated output removed.
- Cloud sign-up/sign-in/reset/confirmation and Android callback handling remain MANUAL_REQUIRED because no project credentials or device were provided.

## Q03 validation

- `supabase/tests/static_migration_checks.ps1`: PASS for 14 RLS tables, fixed-search-path definer functions, explicit RPC grants, private bucket limits, and required SQL case names.
- Three versioned migrations and one 17-case pgTAP file are present.
- `supabase --version`: BLOCKED (CLI not installed).
- `docker --version`: PASS (client 29.3.0); `docker info`: BLOCKED (Docker Desktop Linux daemon not running).
- PostgreSQL execution, `supabase db lint`, pgTAP, and generated database types: NOT RUN. No remote project was linked or changed.

## Q04 validation

- `ARCHITECTURE.md` defines UI → repository/gateway → adapter dependency direction and owner boundaries.
- `npm run typecheck` and `npm run lint`: PASS.
- `npm test -- --ci`: PASS, 13 suites / 46 tests. Q04 covers age 18+, filter bounds, canonical pairs, call transitions, safe errors, message dedupe, swipe parsing, server RPC use, and no phantom match.
- `npx expo-doctor --verbose`: BLOCKED_ENV on this run because the registry check emitted no output for 60 seconds; interrupted rather than claiming PASS. Q04 changed no package manifest or native config.
- No PostgreSQL/RLS integration or real media test is claimed. `DEMO_ONLY` fixtures are isolated and are not imported by any production adapter.

## Q05 validation

- `npm ci`: PASS after an approved retry outside Windows sandbox; 1,298 packages installed and lockfile unchanged.
- `npm run typecheck`, `npm run lint`, `npm test -- --ci`: PASS; 13 suites / 46 tests.
- Git/path/env checks: PASS; no tracked `mobile/`, only `heartsync/.env.example` is tracked, package lock unchanged, and diff whitespace check clean.
- `npm audit --json`: completed read-only with 12 low / 3 high / 0 critical. The suggested remediations are incompatible major downgrades (Expo 51/Jest 25), so no force fix was applied.
- `npx expo-doctor`: BLOCKED_ENV because the registry phase emitted no output for 60 seconds twice; last completed Q02 result remains 20/20, but Q05 does not claim a fresh PASS.
- `docs/TEAM_HANDOFF.md` and `docs/SETUP_MANUAL.md` make UI work independently actionable; no remote issue, branch, build, project, or migration was created.

## Q06 validation

- Current official/registry peer ranges were checked before install and recorded in ADR-009; five native/client packages are exact-version locked.
- `npm ls` shows the selected LiveKit client and WebRTC packages deduped under RN SDK 3.1.0.
- TypeScript, ESLint, Expo public config and `npx expo-doctor`: PASS; Doctor 20/20.
- Jest: PASS, 14 suites / 52 tests, including full call-state and short-lived grant parsing.
- Expo prebuild: PASS; generated Android manifest contains camera/microphone/audio permissions and JitPack. The verified disposable native directory was removed after inspection and can be regenerated.
- Android Hermes export: PASS, 1,258 modules / 5 MB; verified disposable export removed.
- Edge Function is a static template only: not served/deployed, not executed against RLS, and contains no credentials. EAS build, runtime permission flow, audio/video and two-device connectivity are MANUAL_REQUIRED.

## Q07 validation and findings

- TypeScript, ESLint, 14 Jest suites / 53 tests, Expo Doctor 20/20, static SQL and token gates: PASS.
- Secret scan: no high-confidence key/private-key value; only `.env.example` templates tracked; no `EXPO_PUBLIC_*SECRET` usage; no screen directly calls table/RPC/Realtime/function APIs.
- Fixed: authentication SQLSTATE `28000` maps to `unauthorized`; local-only `idle` no longer fits persisted call status; join grant is revalidated for expiry immediately before media connect.
- High-priority blockers: migrations/RLS/pgTAP never executed; discovery has no secure server projection for derived age; chat adapter/Realtime publication/subscription is absent; token function has not run against auth/RLS; Android permission/media behavior is untested.
- Dependency risk: 13 low / 3 high / 0 critical. High findings remain in the Expo CLI → Zod chain. npm offers Expo 51/Jest 25-level incompatible downgrades, so no automated fix was applied.
- `docs/DOCUMENTATION_DELTA.md` now names exact SRS/SDS chapters/diagrams/sequences to revise. The source DOCX files remain unchanged.

## Q01 validation

- `npm run typecheck`: PASS.
- `npm run lint`: PASS with no warnings after Expo flat-config setup.
- `npx expo-doctor`: PASS, 20/20 after adding the required `expo-font` peer for `expo-symbols`.
- `npx expo config --type public`: PASS; predictive Android back gesture enabled.
- `npx expo export --platform android --output-dir tmp/q01-export-final`: PASS outside the sandbox; 915 modules bundled to 2.1 MB Hermes bytecode. Generated output was removed after verification.
- Emulator/device visual, system Back, keyboard, and TalkBack smoke tests remain BLOCKED because no Android target is connected in this session.

## Q00 validation

- Installed versions after Expo compatibility repair: Expo `~58.0.21`, Expo Dev Client `~58.0.17`, React Native `0.88.1`, React `19.3.0`, TypeScript `~6.0.3`.
- `npm ci`: PASS, 468 packages installed/audited.
- `npx tsc --noEmit`: PASS.
- `npx expo config --type public`: PASS; name `HeartSync`, slug `heartsync`, Android package `com.nhocbinhbo99.heartsync`.
- `npx expo-doctor`: PASS, 20/20 after applying patch-level versions recommended by Expo.
- `npm audit --json`: command completed with expected nonzero vulnerability status; 8 findings (5 low, 3 high, 0 critical). The only offered automatic resolution downgrades Expo to 51, so no forced fix was applied.
