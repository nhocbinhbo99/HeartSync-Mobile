# HeartSync Base Decisions

## ADR-001 Application directory and identity

- **Status:** Accepted for Q00
- **Decision:** Keep `HeartSync-Mobile/` as repository root and use `heartsync/` as the Expo package directory. Set npm package name and Expo slug to `heartsync`, display name to `HeartSync`, and initial Android application ID to `com.nhocbinhbo99.heartsync`.
- **Reason:** Separates application code from Supabase migrations and project documentation while removing the generic `mobile` identity.
- **Trade-off:** The Android ID must be treated as stable after EAS/Play Store linkage; leader review is required before the first linked build.

## ADR-002 Navigation instruction conflict

- **Status:** Accepted for the base queue
- **Decision:** Use React Navigation native stack plus bottom tabs in Q01, as explicitly required by the user-selected base queue, even though the inherited Expo template `AGENTS.md` recommends Expo Router.
- **Reason:** The current project is the `blank-typescript` template and the queue explicitly rejects an unnecessary router migration.
- **Trade-off:** `heartsync/AGENTS.md` remains in the repository as historical/local guidance, so this ADR must be consulted for this project.

## ADR-003 Documentation delta location

- **Status:** Accepted
- **Decision:** Maintain `docs/DOCUMENTATION_DELTA.md` as the canonical file and keep a pointer at `docs/codex/DOCUMENTATION_DELTA.md`.
- **Reason:** The supplemental prompt and base queue specify different paths; a single canonical source avoids divergent copies.

## ADR-004 Reference documents are requirements/design input

- **Status:** Accepted
- **Decision:** SRS v1.3 controls scope and business behavior; SDS v1.3 and the UI PDF are design references. Verified migrations, contracts, code, and tests will control implementation details.
- **Reason:** SDS diagrams are placeholders and the starting source contained only the default Expo screen.

## ADR-005 Expo patch alignment and audit risk

- **Status:** Accepted for Q00
- **Decision:** Align Expo packages to versions reported by Expo Doctor: Expo `~58.0.21`, Expo Dev Client `~58.0.17`, and React Native `0.88.1`. Do not run `npm audit fix --force`.
- **Reason:** Expo Doctor initially failed on three patch mismatches and passed 20/20 after the update. npm's proposed vulnerability fix is a breaking downgrade to Expo 51.
- **Trade-off:** The transitive `@expo/cli`/`zod` chain remains reported as 3 high and 5 low findings. It is tracked for Q07 and must be reevaluated when Expo publishes a compatible fix.
