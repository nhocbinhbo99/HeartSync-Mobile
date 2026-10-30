# HeartSync Test Report

| ID | Queue | Type | Command / evidence | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| DOC-01 | Pre-Q00 | Document extraction | Bundled Python `python-docx` / OOXML | Extract paragraphs and tables | SRS 30 tables, SDS 26 tables | PASS |
| DOC-02 | Pre-Q00 | PDF visual review | Poppler render plus page inspection | Inspect 13 reference pages | All 13 pages inspected | PASS |
| DOC-03 | Pre-Q00 | DOCX visual review | Packaged `render_docx.py` | Render page PNGs | `soffice.exe` unavailable | BLOCKED |
| Q00-INSTALL | Q00 | Reproducible install | `npm ci` | Clean install from lockfile | 468 packages installed/audited | PASS |
| Q00-TS | Q00 | TypeScript | `npx tsc --noEmit` | Exit 0 | Exit 0 | PASS |
| Q00-CONFIG | Q00 | Expo config | `npx expo config --type public` | Expected public identity | `HeartSync` / `heartsync` / `com.nhocbinhbo99.heartsync` | PASS |
| Q00-EXPO | Q00 | Expo health | `npx expo-doctor` | 20 checks pass | 20/20 after compatible patch updates | PASS |
| Q00-AUDIT | Q00 | Dependency security | `npm audit --json` read-only | Record current findings | 5 low, 3 high, 0 critical; forced fix would downgrade Expo | RISK |
| Q00-DEVICE | Q00 | Android device | Development build/device run | App opens as HeartSync | Not run | BLOCKED |
| Q01-TS | Q01 | Type safety | `npm run typecheck` | Exit 0 | Exit 0 | PASS |
| Q01-LINT | Q01 | Static analysis | `npm run lint` | No errors/warnings | No errors/warnings | PASS |
| Q01-EXPO | Q01 | Expo health | `npx expo-doctor` | 20 checks pass | 20/20 | PASS |
| Q01-CONFIG | Q01 | Expo config | `npx expo config --type public` | Android identity and back config resolve | Expected values resolved | PASS |
| Q01-BUNDLE | Q01 | Android production bundle | `npx expo export --platform android` | Hermes bundle generated | Final: 915 modules, 2.1 MB HBC | PASS |
| Q01-UNIT | Q01 | Unit/UI runner | Validation/navigation utility tests | Runner-compatible tests where useful | No runner added; Q01 has no business adapter, and Q02 must add mocked auth tests | DEFERRED |
| Q01-NAV-DEVICE | Q01 | Android UI smoke | Auth → preview shell → all tabs/details; system Back | All routes open; no overlap/crash | No target connected | BLOCKED |
| Q01-A11Y-DEVICE | Q01 | Android accessibility | Large font, TalkBack, keyboard/insets | Controls remain usable | No target connected | BLOCKED |
| Q02-UNIT | Q02 | Jest unit/provider | `npm test -- --ci` | Config/auth/guard/lifecycle tests pass offline | 5 suites, 14 tests PASS | PASS |
| Q02-TS | Q02 | Type safety | `npm run typecheck` | Exit 0 | Exit 0 | PASS |
| Q02-LINT | Q02 | Static analysis | `npm run lint` | No errors/warnings | No errors/warnings | PASS |
| Q02-EXPO | Q02 | Expo health | `npx expo-doctor` | 20 checks pass | 20/20 | PASS |
| Q02-CONFIG | Q02 | Native config | `npx expo config --type public` | Scheme/plugins resolve | `heartsync`; font/sqlite/asset plugins | PASS |
| Q02-BUNDLE | Q02 | Android production bundle | `npx expo export --platform android` | Hermes bundle generated without env | 1,015 modules, 3 MB HBC | PASS |
| Q02-NOCONFIG | Q02 | Safe fallback | Config/provider tests + code route | Missing env shows setup-required, no throw | Mocked/tested | PASS |
| Q02-CLOUD | Q02 | Real Supabase Auth | Development project/email/callback/device | Sign-up, confirm, sign-in, restore, reset work | No project/env/device supplied | MANUAL_REQUIRED |
| Q02-AUDIT | Q02 | Dependency security | `npm audit --json` | Record findings without incompatible forced downgrade | 12 low, 3 high, 0 critical | RISK |
| Q03-STATIC | Q03 | Migration static gate | `supabase/tests/static_migration_checks.ps1` | RLS/grants/search-path/storage/test coverage patterns present | 14 tables + 4 RPCs PASS | PASS_STATIC_ONLY |
| Q03-CLI | Q03 | Supabase CLI | `supabase --version` | CLI available | Command not found | BLOCKED |
| Q03-DOCKER | Q03 | Local database runtime | `docker info` | Docker daemon reachable | Docker Desktop Linux pipe absent | BLOCKED |
| Q03-RESET | Q03 | Migration execution | `supabase db reset` | All migrations apply | Not run | BLOCKED |
| Q03-RLS | Q03 | pgTAP security | `supabase test db` | 17 cases pass | Prepared, not run | BLOCKED |
| Q03-LINT | Q03 | Database lint | `supabase db lint` | No schema/security errors | Not run | BLOCKED |
| Q03-TYPES | Q03 | Generated DB types | `supabase gen types typescript --local` | Types reflect applied schema | Not run; handwritten `domain.types.ts` clearly labeled | BLOCKED |
| Q04-TS | Q04 | Type safety | `npm run typecheck` | Exit 0 | Exit 0 | PASS |
| Q04-LINT | Q04 | Static analysis | `npm run lint` | Exit 0, no warnings | Exit 0 | PASS |
| Q04-UNIT | Q04 | Offline domain/contracts | `npm test -- --ci` | Core invariants and adapter behavior pass | 13 suites / 46 tests PASS | PASS |
| Q04-NO-PHANTOM | Q04 | Match safety | Swipe parser + repository tests | Match UI requires confirmed server `match_id` | Missing ID and mismatched outcomes rejected | PASS |
| Q04-RLS-INTEGRATION | Q04 | Server security | Local Supabase pgTAP | Client contracts and RLS agree | Not runnable until Q03 environment exists | BLOCKED |
| Q04-DOCTOR | Q04 | Expo health | `npx expo-doctor --verbose` | Complete registry checks | No output for 60 seconds; interrupted | BLOCKED_ENV |
| Q05-INSTALL | Q05 | Reproducible install | `npm ci` | Install from committed lockfile | Sandbox EPERM; approved retry installed 1,298 packages | PASS |
| Q05-TS | Q05 | Type safety | `npm run typecheck` | Exit 0 | Exit 0 | PASS |
| Q05-LINT | Q05 | Static analysis | `npm run lint` | Exit 0 | Exit 0 | PASS |
| Q05-UNIT | Q05 | Jest | `npm test -- --ci` | All tests pass | 13 suites / 46 tests | PASS |
| Q05-DOCTOR | Q05 | Expo health | `npx expo-doctor` | Complete all checks | Registry phase produced no output for 60 seconds | BLOCKED_ENV |
| Q05-AUDIT | Q05 | Dependency security | approved `npm audit --json` | Record without forced mutation | 12 low / 3 high / 0 critical; incompatible fixes only | RISK |
| Q05-GIT | Q05 | Repository hygiene | tracked path/env/lock/diff checks | No old path/secrets/lock drift | No tracked `mobile`; template-only env; unchanged lock; clean diff check | PASS |
| Q06-PEERS | Q06 | Compatibility | npm registry peer metadata + `npm ls` | Selected versions satisfy direct peers | RN 3.1.0 / WebRTC 150.1.1 / client 2.23.0 deduped; Expo plugin ranges satisfied | PASS |
| Q06-TS-LINT | Q06 | Static quality | `npm run typecheck`; `npm run lint` | Exit 0 | Exit 0 | PASS |
| Q06-UNIT | Q06 | Call FSM/grant | `npm test -- --ci` | Invalid transitions/grants rejected | 14 suites / 52 tests | PASS |
| Q06-CONFIG | Q06 | Expo/native config | public config + Android prebuild | Plugins/permissions resolve | CAMERA, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS and JitPack generated | PASS |
| Q06-DOCTOR | Q06 | Expo health | approved `npx expo-doctor` | 20 checks pass | 20/20 | PASS |
| Q06-BUNDLE | Q06 | Android JS/Hermes | `npx expo export --platform android` | LiveKit bootstrap bundles | 1,258 modules / 5 MB HBC | PASS |
| Q06-FUNCTION | Q06 | Token server | static script + code review | JWT/active match/participant/TTL checks, no client secret | Template prepared; runtime unavailable | PASS_STATIC_ONLY |
| Q06-DENO | Q06 | Edge Function runtime | `deno --version` / local serve | Type-check and execute function | Deno and Supabase CLI unavailable | BLOCKED_ENV |
| Q06-NATIVE-BUILD | Q06 | Android development APK | EAS/local Gradle | Native project compiles and installs | No EAS login/build/device | BLOCKED_MANUAL |
| Q06-MEDIA | Q06 | Two-device media | audio + video on two physical Android devices | Remote tracks in both directions; permission handling | Not run | BLOCKED_MANUAL |
| Q07-AUTH-FAIL | Q07 | Auth negative path | mocked provider/Jest | Invalid login is sanitized and guard remains auth-only | Covered; no raw provider message | PASS_OFFLINE |
| Q07-ROLE-PRIVACY | Q07 | RLS negatives | prepared pgTAP | anon/cross-user/non-match/report privacy enforced | 17 cases present; database runtime unavailable | BLOCKED_ENV |
| Q07-DUP-MATCH | Q07 | Race/idempotency | static SQL + offline parser/adapter tests | Canonical unique match; no phantom UI | Patterns and client behavior pass; concurrent DB execution absent | PASS_STATIC_ONLY |
| Q07-CHAT-2USER | Q07 | Authenticated chat | A/B/C integration | active A/B allowed; C and blocked denied; dedupe once | RLS cases prepared, adapter/Realtime and DB execution absent | BLOCKED_ENV |
| Q07-MEDIA-TOKEN | Q07 | Server token boundary | static function gate | JWT, active participant, canonical room, TTL, server secret | 7 patterns PASS; function not executed/deployed | PASS_STATIC_ONLY |
| Q07-PERMISSIONS | Q07 | Android camera/mic | development APK/device | deny/grant/retry and video-only camera behavior | Manifest generated; runtime not tested | BLOCKED_MANUAL |
| Q07-TS-LINT-UNIT | Q07 | Local quality | typecheck/lint/Jest | All exit 0 | 14 suites / 53 tests | PASS |
| Q07-DOCTOR | Q07 | Expo health | approved `npx expo-doctor` | 20 checks pass | 20/20 | PASS |
| Q07-AUDIT | Q07 | Dependency security | approved `npm audit --json` | Findings triaged without breaking mutation | 13 low / 3 high / 0 critical; incompatible downgrade only | RISK |
| Q07-SECRETS | Q07 | Secret/config scan | `rg`, tracked env/key and direct access scans | No credentials/private keys/client secrets | No high-confidence matches; example templates only | PASS |

## Security notes and open quality risks

No production credential was found or introduced. Mobile environment names expose only Supabase URL and publishable key. LiveKit key/secret names occur only in the Edge Function and placeholder documentation; actual values are not present. Auth routes are selected from session/recovery/setup state, and main routes are not registered for unauthenticated users.

The following are release blockers, not accepted residual behavior:

1. **Server enforcement unexecuted:** Q03 SQL/RLS and 17 pgTAP cases have static evidence only. Do not deploy or claim data privacy until a local reset/lint/test succeeds and the exact development project is reviewed.
2. **Discovery projection missing:** `ProfilePublic.age` is intentionally derived, but no reviewed server view/RPC currently computes age without exposing DOB. Minh must not query `profile_private` from the client.
3. **Chat not integrated:** no `ChatRepository` adapter, Realtime publication/subscription, pagination, or A/B/C runtime proof exists. RLS policy text alone is insufficient.
4. **Calling not integrated:** Edge Function lacks Deno/runtime evidence; invitation/accept persistence and runtime permission UX are not implemented; native APK and two-device media remain manual.
5. **Incomplete adapters/UI:** match listing and most domain adapters return placeholders or do not exist. Existing screens provide loading/empty/error shells, not finished data flows.
6. **Dependency advisories:** Expo CLI's transitive Zod advisory and low-severity Expo/Jest chains remain. Track compatible upstream releases; do not apply npm's breaking downgrade.

## Q08 final release gate

| ID | Type | Actual | Status |
|---|---|---|---|
| Q08-DOCS | artifact/link validation | 13 required files exist and their local links resolve | PASS |
| Q08-TS-LINT | static quality | TypeScript and ESLint exit 0 | PASS |
| Q08-UNIT | Jest | 14 suites / 53 tests | PASS |
| Q08-STATIC-SERVER | SQL/function static gates | 14 RLS tables / 4 RPCs and 7 token patterns | PASS_STATIC_ONLY |
| Q08-DOCTOR | Expo health | 20/20 checks | PASS |
| Q08-SECRETS-DIFF | repository hygiene | no high-confidence secret; diff check clean | PASS |
| Q08-SERVER-DEVICE | integration acceptance | database/function/cloud/Android/two-device gates not run | BLOCKED_MANUAL |

## Post-Q08 Q03 environment retry

| ID | Type | Actual | Status |
|---|---|---|---|
| Q03-CLI-RETRY | local tooling | Supabase CLI 2.122.0 installed and reports its version | PASS |
| Q03-CONFIG | local configuration | config parses through CLI initialization; exact callbacks/JWT boundary recorded | PASS_OFFLINE |
| Q03-DOCKER-RETRY | local engine | Docker Desktop 4.66.0 backend crashes during Inference manager initialization | BLOCKED_ENV |
| Q03-SQL-RETRY | migration/pgTAP/lint/types | not run because Docker engine never became ready | BLOCKED_ENV |
| Q03-CLI-CLEAN-INSTALL | reproducibility | `npm ci`, CLI version, TypeScript, lint, Jest, Doctor | 1,349 packages; CLI 2.122.0; 53 tests; Doctor 20/20 | PASS |
