# HeartSync Base Run Log

All commands were run from the verified repository root unless a different working directory is shown. Secrets and credential values are not logged.

| Date | Queue | Command / action | Exit | Result |
|---|---|---|---:|---|
| 2026-10-29 | Pre-Q00 | `git rev-parse --show-toplevel` | 0 | Verified project root |
| 2026-10-29 | Pre-Q00 | Extract SRS/SDS with bundled Python | 0 | SRS: 30 tables; SDS: 26 tables |
| 2026-10-29 | Pre-Q00 | Render `dating_app.pdf` with bundled Poppler | 0 | 13 PNG pages created and inspected |
| 2026-10-29 | Pre-Q00 | Render DOCX with packaged renderer | 1 | BLOCKED: bundled runtime has no `soffice.exe` |
| 2026-10-29 | Q00 | `git status -sb`, sanitized `git remote -v`, `git log -3 --oneline` | 0 | Baseline captured; pre-existing deletion of `mobile/.claude/settings.json` preserved |
| 2026-10-29 | Q00 | Verify paths/reparse points; move `mobile` to `heartsync` | 0 | Safe in-project move completed |
| 2026-10-29 | Q00 | `npm ci` (sandbox) | 1 | Windows sandbox returned `EPERM`; retried with approved elevated execution |
| 2026-10-29 | Q00 | `npm ci` (approved execution) | 0 | 467 packages installed initially; lockfile remained valid |
| 2026-10-29 | Q00 | `npx tsc --noEmit` | 0 | PASS |
| 2026-10-29 | Q00 | `npx expo config --type public` | 0 | PASS; expected name/slug/package resolved |
| 2026-10-29 | Q00 | `npx expo-doctor` (initial) | 1 | 19/20; three SDK 58 patch mismatches |
| 2026-10-29 | Q00 | `npx expo install --fix` | 0 | Updated Expo, Expo Dev Client, and React Native patch versions |
| 2026-10-29 | Q00 | `npx tsc --noEmit` and `npx expo-doctor` (repeat) | 0 | TypeScript PASS; Expo Doctor 20/20 PASS |
| 2026-10-29 | Q00 | `npm audit --json` (read-only) | 1 | 8 findings: 5 low, 3 high, 0 critical; no force fix |
| 2026-10-29 | Q01 | Install React Navigation packages with `npx expo install` | 0 | Native stack, bottom tabs, screens, and safe-area packages resolved for SDK 58 |
| 2026-10-29 | Q01 | Install `expo-symbols`; inspect official SDK 58 API | 0 | Cross-platform native symbols selected; deprecated icon path avoided |
| 2026-10-29 | Q01 | `npm run typecheck` (initial) | 1 | Unsupported `StatusBar.backgroundColor` type found and removed |
| 2026-10-29 | Q01 | `npm run typecheck` (repeat) | 0 | PASS |
| 2026-10-29 | Q01 | `npm run lint` setup | 1 | Expo generated flat config; its wrapper misread ESLint 9, so the script now calls `eslint .` directly |
| 2026-10-29 | Q01 | `npm run lint` | 0 | PASS with no warnings after two style fixes |
| 2026-10-29 | Q01 | `npx expo-doctor` (initial) | 1 | 19/20; `expo-font` peer required by `expo-symbols` |
| 2026-10-29 | Q01 | `npx expo install expo-font`; repeat Doctor | 0 | Peer installed; Expo Doctor 20/20 PASS |
| 2026-10-29 | Q01 | Android export (sandbox) | 1 | Hermes could not write system temporary bytecode (`permission denied`) |
| 2026-10-29 | Q01 | Android export (approved execution) | 0 | 909 modules; 2.1 MB Hermes bundle; generated output removed after verification |
| 2026-10-29 | Q01 | UI reviewer pass; feature-first/accessibility corrections; final Android export | 0 | Code/offline review PASS; 915 modules; 2.1 MB Hermes bundle; output removed |
| 2026-10-29 | Q01 | Impeccable finish review and design-system documentation | 0 | Code review PASS; `DESIGN.md` and schema v2 sidecar review PASS |
| 2026-10-29 | Q02 | Inspect official Supabase Expo, auth lifecycle, password reset, Expo SQLite/Linking/Jest docs | 0 | Selected SQLite localStorage only; separate PKCE confirmation/recovery callbacks; Jest 30 |
| 2026-10-29 | Q02 | Install Supabase, URL polyfill, SQLite, Linking, Jest/Testing Library and required Expo peers | 0 | SDK 58-compatible dependency graph installed; test packages kept in devDependencies |
| 2026-10-29 | Q02 | Initial TypeScript/lint/Jest | 1 | Found AppState nullable type, React effect rule, missing Expo Asset peer, and async test-act issues; repaired |
| 2026-10-29 | Q02 | `npm test -- --ci` | 0 | 5 suites, 14 tests PASS |
| 2026-10-29 | Q02 | TypeScript, ESLint, Expo Doctor, public config | 0 | PASS; Doctor 20/20; scheme/plugins resolved |
| 2026-10-29 | Q02 | Android production export | 0 | 1,015 modules; 3 MB Hermes bundle; generated output removed |
| 2026-10-29 | Q02 | `npm audit --json` | 1 | 15 findings: 12 low, 3 high, 0 critical; proposed fixes require incompatible Expo 51/Jest 25 downgrades |
