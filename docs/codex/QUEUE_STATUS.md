# HeartSync Codex Queue Status

| ID | Work | Status | Evidence / Tests | Blocker / Manual | Last update |
|---|---|---|---|---|---|
| Q00 | Audit + rename `mobile` to `heartsync` | DONE | Safe rename; `npm ci`; TypeScript PASS; Expo Doctor 20/20; config PASS | Android device not tested; audit has 3 high/5 low transitive findings | 2026-10-29 |
| Q01 | Tooling + Navigation + Theme | DONE | TypeScript PASS; ESLint PASS; Expo Doctor 20/20; Android Hermes bundle PASS; code/design reviews PASS | Emulator/device visual/accessibility smoke test pending | 2026-10-29 |
| Q02 | Supabase Client + Auth foundation | DONE | TypeScript/lint PASS; Jest 5 suites/14 tests PASS; Expo Doctor 20/20; Android Hermes bundle PASS | MANUAL_REQUIRED: Supabase project/env/redirect and real-email flow not tested | 2026-10-29 |
| Q03 | SQL migrations + RLS + data types | PENDING | | | 2026-10-29 |
| Q04 | Domain contracts + repositories | PENDING | | | 2026-10-29 |
| Q05 | Early team handoff + QA | PENDING | | | 2026-10-29 |
| Q06 | LiveKit/EAS feasibility | PENDING | | | 2026-10-29 |
| Q07 | Quality + security review | PENDING | | | 2026-10-29 |
| Q08 | Final release notes + next actions | PENDING | | | 2026-10-29 |
