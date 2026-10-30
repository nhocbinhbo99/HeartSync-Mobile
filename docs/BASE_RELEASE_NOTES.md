# HeartSync Base Release Notes

Release state: **BASE_RELEASED_WITH_BLOCKERS**

Parallel-work milestone: **BASE_READY_FOR_PARALLEL_WORK**

Date: 2026-10-30

## Delivered

- Renamed the Expo package to `heartsync`, aligned Expo SDK 58 dependencies, and established reproducible checks.
- Added typed React Navigation auth/setup/recovery/main modes, four tabs, detail routes, theme, accessible controls, and loading/empty/error shells.
- Added Supabase PKCE auth with Expo SQLite session persistence, guarded routes, confirmation/recovery callbacks, and sanitized error handling.
- Prepared three versioned migrations for 14 RLS tables, private profile/photo boundaries, canonical/atomic swipe-match behavior, unmatch/block/start-call RPCs, and 17 pgTAP cases.
- Added shared domain types/rules, six repository/gateway interfaces, stable result/error contracts, an atomic swipe adapter, and DEMO_ONLY-isolated fixtures.
- Added exact-version LiveKit/Expo native packages, globals bootstrap, Android permissions/plugins, EAS APK profiles, short-lived-grant parsing, media-truth state rules, and an authenticated Edge Function token template.
- Published Windows/Android/Supabase setup, team ownership/issues, SRS/SDS delta, test evidence, security notes, and manual actions.

## Verified locally

| Gate | Result |
|---|---|
| clean lockfile install | PASS (`npm ci`; Windows sandbox retry required) |
| TypeScript / ESLint | PASS |
| Jest | PASS — 14 suites / 53 tests |
| Expo Doctor | PASS — 20/20 |
| Android Expo prebuild | PASS — native permissions/plugins generated |
| Android Hermes export | PASS — 1,258 modules / 5 MB |
| migration/token static gates | PASS_STATIC_ONLY — 14 RLS tables, 4 RPCs, 7 token patterns |
| secret/config scan | PASS — example templates only |
| npm audit | RISK — 13 low / 3 high / 0 critical; incompatible forced fixes rejected |

## Not verified or not implemented

- Supabase CLI/Docker database execution, migration reset, database lint, pgTAP and generated database types.
- Secure discovery server projection deriving age without exposing DOB.
- Production domain adapters, match listing, chat persistence/Realtime lifecycle, and feature-complete UI.
- LiveKit Edge Function runtime/deployment, call invitation/accept persistence, EAS native build, Android runtime permission UX, or two-device media.
- Any remote migration, deployment, issue, branch, push, PR, EAS/LiveKit/Supabase project mutation.

## Atomic base commits

1. `ea3de2a chore(base): establish Q00 repository baseline`
2. `e991898 feat(shell): add Q01 navigation and theme foundation`
3. `6a6ec23 feat(auth): add Q02 Supabase session foundation`
4. `a8acbae feat(database): prepare Q03 schema and RLS`
5. `fddeb00 feat(domain): define Q04 service contracts`
6. `f1d4daa docs(handoff): publish Q05 team readiness guide`
7. `8d85c0b feat(calling): scaffold Q06 LiveKit boundary`
8. `aec896d fix(security): complete Q07 boundary audit`

No commit was pushed and no pull request was opened. The next integration commit should contain only reviewed server projection/adapter work after Q03 local tests pass; a suitable subject is `feat(discovery): add RLS-safe candidate projection`.
