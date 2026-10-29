# HeartSync Mobile

HeartSync is an Android-first dating application built with Expo SDK 58, React Native, and TypeScript. The Expo application lives in `heartsync/`; database migrations and project documentation stay at the repository root.

## Current status

The repository is in the base implementation queue. Q00 establishes the verified baseline and naming. Authentication, navigation, Supabase schema, realtime chat, and LiveKit calling must not be treated as working until their queue checkpoints and tests are complete.

## Local baseline commands

```powershell
cd heartsync
npm ci
npx tsc --noEmit
npx expo-doctor
```

Use Expo Development Build for native calling dependencies. Expo Go is not acceptance evidence for Audio or Video Call.

Progress and blockers are tracked in [`docs/codex/QUEUE_STATUS.md`](docs/codex/QUEUE_STATUS.md). Manual steps are tracked in [`docs/codex/MANUAL_ACTIONS.md`](docs/codex/MANUAL_ACTIONS.md).
