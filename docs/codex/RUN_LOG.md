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
