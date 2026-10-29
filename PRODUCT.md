# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Primary users are adults aged 18 or older using an Android phone to create a dating profile, discover suitable people, establish a mutual Match, and communicate safely. This record is inferred from the approved SRS v1.3 and base queue because no structured interview mechanism is available in this session.

The three-person student development team is a secondary audience for the base: Công owns account/profile/preferences and integration, Minh owns discovery/matching, and Hảo owns chat/calling/safety.

## Product Purpose

HeartSync enables a user to build a profile, discover compatible profiles, express interest or pass, and communicate only after both people have created a valid Match. Success means the core flows are honest about backend state, protect private data, and can be verified on real Android devices.

## Positioning

The product is organized around a permissioned connection boundary: a mutual Like creates one server-confirmed Match, and only an active Match permits new chat or call interactions. This mechanism is more important than visual similarity to any existing dating app.

## Operating Context

Users operate the app primarily one-handed on Android phones, often with intermittent mobile connectivity and system font scaling. Camera, microphone, and location are requested only when a feature needs them. Development uses Windows, Expo Development Build, Supabase, and two physical Android devices for final realtime/media verification.

## Capabilities and Constraints

- Scope contains one actor, Người dùng, and 19 use cases from SRS v1.3.
- Authentication state separates public auth flows from signed-in profile, discovery, saved, match, chat, call, block, and report flows.
- Users must be 18 or older; server validation is required before that rule is considered implemented.
- Like-to-Match must be atomic and idempotent; client-side checks never replace database constraints or RLS.
- Chat and call access requires an active Match. Unmatch or Block denies new messages and calls.
- Audio and Video Call are core features, but neither is verified until a Development Build works between two real devices.
- Precise coordinates, login email, tokens, reports, and other private data must not appear in Discovery.
- Premium plans, social/phone sign-in, mini-games, ML matching, and background push systems shown or implied by references are outside this base.
- Re-match policy and post-unmatch history visibility remain open decisions before remote schema approval.

## Brand Commitments

The product name is HeartSync. The queue pins a light Android-first visual language using white, cool cyan/aqua accents, readable dark text, and familiar navigation. The 13-page `dating_app.pdf` is a UX reference only; Tinder branding, copyrighted assets, and unsupported commercial claims must not be copied.

## Evidence on Hand

- `docs/reference/HeartSync_SRS_v1.3.docx`: agreed scope and business behavior.
- `docs/reference/HeartSync_SDS_v1.3.docx`: proposed design with incomplete diagrams.
- `docs/reference/dating_app.pdf`: 13 image-only mobile UI references.
- No production user research, testimonials, backend, cloud configuration, or device-test evidence exists in the repository at Q00.

## Product Principles

1. Confirm server and media state before showing success.
2. Make permissions and blocked states understandable and recoverable.
3. Protect the connection boundary with server authorization, not UI convention.
4. Use familiar Android interaction patterns and accessible touch targets.
5. Keep shared contracts stable so three developers can work in parallel.

## Accessibility & Inclusion

Interactive targets must be at least 48 by 48 dp, text must remain legible with Android font scaling, color must not be the only state signal, and system Back/keyboard/safe-area behavior must work. Gender and language preferences must allow multiple values without changing a user's own identity fields.
