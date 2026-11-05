# HeartSync MVP implementation status

Updated: 2026-10-30

## Implemented in repository

- Auth distinguishes an unconfirmed email from invalid credentials.
- Profile edit, private DOB/location consent, private photo upload UI (maximum six), preferences and saved profiles now use repository boundaries.
- Discovery, server-confirmed swipe/match, match list, realtime chat shell, incoming audio-call state and an audio-only call UI replace the original placeholders.
- UC17 video call has a repository implementation on `feature/video-call`: Chat entry, incoming routing, two video surfaces, camera/microphone controls and a proposed forward migration. Cloud deployment and two-device media acceptance are pending; it must not be represented as verified.
- `20261030150000_mvp_contracts.sql` is a forward-only migration containing the six-photo limit, public discovery/profile/match contracts, call accept/reject/end RPCs and Realtime publication for only `messages` and `calls`.
- The proposed `livekit-token` update issues a microphone-only grant for audio and camera plus microphone grant for video, only for an accepted call of the same type belonging to an active Match participant.

## Not yet applied or verified on cloud

1. Review and apply `supabase/migrations/20261030150000_mvp_contracts.sql` to the dedicated `heartsync-dev` project only. This changes database constraints, RPCs and Realtime publication.
2. Generate/review Supabase database types after that migration; handwritten UI/domain types remain the source of truth until then.
3. Create synthetic users A/B/C and their complete profiles; no personal account, image or real credential belongs in source control.
4. Configure LiveKit secrets only in Supabase Function Secrets, deploy `livekit-token` with JWT verification enabled, then create/install an EAS Android development build on two devices.
5. Run A/B/C RLS, chat, block/unmatch and two-device audio acceptance checks before claiming those features work.

## Ownership

| Owner | Review / acceptance responsibility |
|---|---|
| Công | Cloud migration review/apply, A/B/C setup, profile/privacy checks, LiveKit/EAS secrets |
| Minh | Discovery filter/card/swipe/match device evidence after migration apply |
| Hảo | Chat Realtime and audio/video-call integration evidence after migration/LiveKit deployment |

## Local evidence

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test -- --runInBand`: PASS, 16 suites / 58 tests
- `npx expo config --type public`: PASS; image picker, location, microphone and LiveKit configuration resolve
- `npx expo export --platform android`: PASS, 1,280 modules

The Android export is compilation evidence only. Expo Go is suitable for UI/basic auth; native auth callbacks and audio require a development build.
