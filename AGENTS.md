# HeartSync — AI Agent Guidelines & Context

Welcome AI Agent! You are assisting in developing **HeartSync**, a modern Android-first dating application.

## 🎯 1. Project Overview & Tech Stack
- **Framework:** React Native with **Expo SDK 58** (`heartsync/`).
- **Language:** TypeScript (strict mode, no implicit any).
- **Navigation:** **React Navigation v7** (Native Stack + Bottom Tabs).
  - ⚠️ **CRITICAL RULE:** Do **NOT** use Expo Router! Routes are declared in `src/navigation/types.ts` and `src/navigation/RootNavigator.tsx`.
- **Backend & Database:** Supabase (Auth PKCE, PostgreSQL with RLS on 14 tables, Private Storage Bucket `profile-photos`, RPC atomic functions like `record_swipe`).
- **Calling:** LiveKit SDK (`@livekit/react-native`, `@livekit/react-native-webrtc`) with tokens generated via Supabase Edge Function `livekit-token`.
- **App Execution:** **Expo Development Build** (`npx expo start --dev-client`) on Android devices.

---

## 📚 2. Key Documentation Index (Read These Files First)

Before making code changes, read the specific documentation for your task:

1. **Task Assignment & Current Status (Bắt buộc đọc):**
   - [`docs/PHAN_CHIA_CONG_VIEC_CHI_TIET.md`](docs/PHAN_CHIA_CONG_VIEC_CHI_TIET.md) — Detailed breakdown of 19 Use Cases, ownership (Công, Minh, Hảo), current DB status, and integration rules.
2. **Team Architecture & Technical Handoff:**
   - [`docs/TEAM_HANDOFF.md`](docs/TEAM_HANDOFF.md) — Route graph, service boundaries, and team policies.
   - [`ARCHITECTURE.md`](ARCHITECTURE.md) — Architectural layers, Clean Architecture rules, and dependency direction.
3. **Database Schema & RLS Contracts:**
   - [`DATA_MODEL.md`](DATA_MODEL.md) — 14 tables, columns, Row Level Security policies, storage bucket policies, and RPC definitions.
4. **Service Contracts & Domain Types:**
   - [`heartsync/src/services/contracts.ts`](heartsync/src/services/contracts.ts) — All Repository & Gateway interfaces.
   - [`heartsync/src/shared/types/domain.types.ts`](heartsync/src/shared/types/domain.types.ts) — Core TypeScript domain interfaces.
5. **Business Rules & Use Cases:**
   - [`docs/DOCUMENTATION_DELTA.md`](docs/DOCUMENTATION_DELTA.md) — 19 Use Cases, Business Rules (BR-01 to BR-12: no self-like, 18+ enforcement, canonical pair UUIDs, atomic mutual match).
6. **UI Design System:**
   - [`DESIGN.md`](DESIGN.md) — Color tokens, typography, spacing, and accessibility guidelines.

---

## 🛡️ 3. Core Architectural Rules (DO NOT BREAK)

1. **Clean Architecture Boundary:**
   - **Screens/UI components MUST NOT directly import or call Supabase, Realtime, or LiveKit.**
   - All data fetching and mutations must go through the repository/gateway interfaces in `src/services/contracts.ts`.
2. **Data Privacy (BR-07):**
   - Public candidate DTOs (`ProfilePublic`, `DiscoveryCandidate`) must **NEVER** expose the user's Date of Birth (`dob`) or exact GPS coordinates. Age is calculated, distance is approximate.
3. **Atomic Mutual Match (BR-02, BR-03):**
   - Swiping does **NOT** insert directly into the `matches` table from client code. Always call the atomic server RPC `record_swipe(target_id, direction)`.
4. **Realtime & Calling Lifecycles:**
   - Chat subscriptions must be cleaned up on unmount or unmatch.
   - LiveKit tokens must be retrieved from the backend Edge Function; **NEVER** sign LiveKit tokens on the client.
5. **Quality Verification Before Committing:**
   - From `heartsync/`, run:
     - `npm run typecheck`
     - `npm run lint`
     - `npm test`
     - All checks must pass without errors.
