# HeartSync — Mobile App Guidelines for AI Agents

Welcome! This folder contains the React Native / Expo application for **HeartSync**.

## ⚠️ Critical Architecture Rules for HeartSync

1. **Navigation:**
   - **Do NOT use Expo Router!** The project uses **React Navigation v7** (Native Stack + Bottom Tabs).
   - Routes and params are defined in `src/navigation/types.ts` and `src/navigation/RootNavigator.tsx`.
   - Never create `_layout.tsx` or file-based routes in `src/app/`.

2. **Clean Architecture Boundary:**
   - **Screens MUST NOT import `@supabase/supabase-js` or `livekit-client` directly.**
   - All backend calls must go through the interfaces defined in `src/services/contracts.ts` (`ProfileRepository`, `DiscoveryRepository`, `MatchRepository`, `ChatRepository`, `CallGateway`, etc.).

3. **Privacy & Security:**
   - Never expose `dob` (date of birth) or exact GPS coordinates in public profile models.
   - Match creation is atomic on the server; use `record_swipe` RPC via `MatchRepository`.
   - Never sign LiveKit tokens on the client; fetch from the Supabase Edge Function.

4. **Available Documentation:**
   - Read `../docs/PHAN_CHIA_CONG_VIEC_CHI_TIET.md` for task breakdown and current status.
   - Read `../docs/TEAM_HANDOFF.md` and `../ARCHITECTURE.md` for architecture details.
   - Read `../DATA_MODEL.md` for database schema and RPCs.
   - Read `../docs/DOCUMENTATION_DELTA.md` for the 19 Use Cases and Business Rules.

## 🛠️ Verification Commands

Before completing any task, always ensure these pass:
```bash
npm run typecheck
npm run lint
npm test
```
