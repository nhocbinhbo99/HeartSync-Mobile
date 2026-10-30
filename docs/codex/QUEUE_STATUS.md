# HeartSync Codex Queue Status

| ID | Work | Status | Evidence / Tests | Blocker / Manual | Last update |
|---|---|---|---|---|---|
| Q00 | Audit + rename `mobile` to `heartsync` | DONE | Safe rename; `npm ci`; TypeScript PASS; Expo Doctor 20/20; config PASS | Android device not tested; audit has 3 high/5 low transitive findings | 2026-10-29 |
| Q01 | Tooling + Navigation + Theme | DONE | TypeScript PASS; ESLint PASS; Expo Doctor 20/20; Android Hermes bundle PASS; code/design reviews PASS | Emulator/device visual/accessibility smoke test pending | 2026-10-29 |
| Q02 | Supabase Client + Auth foundation | DONE | TypeScript/lint PASS; Jest 5 suites/14 tests PASS; Expo Doctor 20/20; Android Hermes bundle PASS | MANUAL_REQUIRED: Supabase project/env/redirect and real-email flow not tested | 2026-10-29 |
| Q03 | SQL migrations + RLS + data types | PARTIAL — SQL_PREPARED_NOT_APPLIED | CLI 2.122.0/config/scripts ready; 3 migrations; 14-table static RLS gate; 17 pgTAP cases | BLOCKED: Docker 4.66 crashes in local Inference manager; no SQL execution/remote apply | 2026-10-30 |
| Q04 | Domain contracts + repositories | DONE | Typed boundaries; TypeScript/lint PASS; Jest 13 suites/46 tests PASS | Server/RLS integration remains blocked with Q03; Expo Doctor registry check hung on this run | 2026-10-30 |
| Q05 | Early team handoff + QA | DONE — BASE_READY_FOR_PARALLEL_WORK | `npm ci`, TS, lint, 46 tests PASS; README/setup/handoff delivered | Doctor registry check blocked; Supabase/Android/EAS remain manual | 2026-10-30 |
| Q06 | LiveKit/EAS feasibility | DONE — SCAFFOLD_ONLY | Exact compatible packages; config/prebuild/bundle; 14 suites/52 tests; Doctor 20/20 | MANUAL_REQUIRED: deploy function, EAS native build, permissions and two-device media | 2026-10-30 |
| Q07 | Quality + security review | DONE — AUDIT_COMPLETE | TS/lint/53 tests; static SQL/function gates; Doctor 20/20; secret scan clear | 13 low/3 high audit risk; server/device integrations remain blocked | 2026-10-30 |
| Q08 | Final release notes + next actions | DONE — BASE_RELEASED_WITH_BLOCKERS | 13 required docs/link gate; TS/lint/53 tests; static gates; Doctor 20/20; secret scan | Q03 remains PARTIAL; cloud/database/device/media actions are manual | 2026-10-30 |
