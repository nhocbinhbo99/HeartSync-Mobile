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

## ADR-006 Q01 navigation and icon surface

- **Status:** Accepted for Q01
- **Decision:** Use React Navigation 7 native stack plus bottom tabs, `react-native-safe-area-context`, and Expo SDK 58 `expo-symbols`/`expo-font`. Keep auth submit actions disabled until Q02 and provide an explicitly labeled development-only navigation preview.
- **Reason:** This meets the queue's blank-template constraint, preserves Android-native Back behavior, and avoids fake authentication/data states. Expo's current docs recommend native symbols while marking the older vector-icon path as not recommended.
- **Trade-off:** The visual shell is code-verified but still needs emulator/device inspection for system bars, keyboard, large text, and TalkBack.

## ADR-007 Q02 auth persistence and recovery boundary

- **Status:** Accepted for Q02
- **Decision:** Use the official Expo SQLite `localStorage` polyfill as the only Supabase session adapter, PKCE auth with `detectSessionInUrl: false`, foreground refresh managed once by `AuthProvider`, and separate `heartsync://auth/callback` / `heartsync://auth/recovery` redirects for confirmation and recovery.
- **Reason:** The current Supabase Expo quickstart documents this SQLite adapter; a stable custom scheme is required for development-build callbacks. This avoids mixing persistence implementations and keeps mobile secret handling at the publishable-key boundary.
- **Trade-off:** Real email delivery, redirect allowlisting, session restore, and callback behavior cannot be claimed until a user-owned Supabase development project and Android development build are tested.

## ADR-008 Q03 privacy and relationship lifecycle

- **Status:** Proposed/implemented in prepared SQL; requires review before apply
- **Decision:** Split public profile fields from owner-only DOB/coordinates; keep a current-state swipe row; serialize pair swipes with a transaction advisory lock; make unmatch terminal in BASE; preserve read-only history after unmatch but hide it after block; keep profile photos in a private bucket.
- **Reason:** RLS cannot hide columns, concurrent likes must not create phantom/duplicate matches, and unresolved rematch/history behavior needs a conservative deterministic base contract.
- **Trade-off:** Rematch requires a future migration/product decision. Blocking hides client history without deleting evidence. Claimed age is constrained to 18+ but is not identity-verified.

## ADR-009 Q06 LiveKit and Expo development-build baseline

- **Status:** Accepted for scaffold; real media remains unverified
- **Decision:** Pin `@livekit/react-native` 3.1.0, `@livekit/react-native-webrtc` 150.1.1, `livekit-client` 2.23.0, `@livekit/react-native-expo-plugin` 1.1.0, and `@config-plugins/react-native-webrtc` 15.0.2 with Expo SDK 58 / React Native 0.88.1. Register globals before application modules, configure camera/microphone/audio permissions, and use only development/preview APK builds for this native stack.
- **Compatibility evidence (checked 2026-10-30):** npm registry metadata reports RN SDK 3.1.0 peers `livekit-client ^2.20.0` and WebRTC `^150.1.0`; plugin 1.1.0 supports RN SDK `^2.1 || ^3`; WebRTC config plugin 15.0.2 requires Expo `>=56`. Official LiveKit Expo plugin instructions require these two config plugins and LiveKit documents `registerGlobals()` before use.
- **Security boundary:** The mobile app invokes a Supabase Edge Function. It never signs a LiveKit token or stores API secrets. The template validates the user JWT, active-match RLS visibility, participant identity, canonical room, and five-minute TTL.
- **Media truth:** `Room.connect()` is signaling only. The gateway emits `connected` only after a remote track is subscribed. Final acceptance requires permission behavior, native compilation, and two physical Android devices; none is claimed by this ADR.
- **Sources:** [LiveKit Expo plugin](https://github.com/livekit/client-sdk-react-native-expo-plugin/blob/main/README.md), [LiveKit React Native SDK](https://www.npmjs.com/package/@livekit/react-native), [Supabase authorization headers](https://supabase.com/docs/guides/functions/auth-headers), [Supabase auth context](https://supabase.com/docs/guides/functions/auth-legacy-jwt).

## ADR-010 Reproducible local Supabase CLI

- **Status:** Accepted after Q08
- **Decision:** Pin Supabase CLI `2.122.0` as a HeartSync devDependency and expose repository-aware npm scripts instead of relying on an unversioned global binary.
- **Reason:** The official npm workflow supports a project dependency, keeps the CLI covered by `package-lock.json`, and lets all contributors run the same version on Node 20+.
- **Trade-off:** CLI binaries add optional platform packages to the development lockfile. Docker remains mandatory for the full local stack; the CLI installation alone cannot prove SQL/RLS behavior.
- **Source:** [Supabase CLI local development](https://supabase.com/docs/guides/local-development/cli/getting-started?platform=npx&queryGroups=platform).
