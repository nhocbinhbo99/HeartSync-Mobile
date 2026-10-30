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
