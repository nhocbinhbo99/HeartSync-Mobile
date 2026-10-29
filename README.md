# HeartSync Mobile

HeartSync is an Android-first dating application built with Expo SDK 58, React Native, and TypeScript. The Expo application lives in `heartsync/`; database migrations and project documentation stay at the repository root.

## Current status

Q00 establishes the verified baseline and naming. Q01 adds the typed React Navigation shell, shared light theme, accessible controls, and truthful empty/development states. Authentication, Supabase data, realtime chat, and LiveKit calling must not be treated as working until their later queue checkpoints and tests are complete.

## Local baseline commands

```powershell
cd heartsync
npm ci
npm run typecheck
npm run lint
npx expo-doctor
npx expo start --dev-client
```

On Q01, choose **Xem trước application shell** from the sign-in screen to inspect navigation without creating a fake session. Use Expo Development Build for native calling dependencies. Expo Go is not acceptance evidence for Audio or Video Call.

Progress and blockers are tracked in [`docs/codex/QUEUE_STATUS.md`](docs/codex/QUEUE_STATUS.md). Manual steps are tracked in [`docs/codex/MANUAL_ACTIONS.md`](docs/codex/MANUAL_ACTIONS.md).
