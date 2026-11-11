# HeartSync Pink Romance Redesign — Progress

## Canonical references

The supplied design package is intentionally kept outside Git because it is a
large, untracked concept hand-off. It is available to this task at:

`D:\documents\23731851_HoangPhuocThanhCong\Nam4_Ky1\Mobile\HeartSync\SRC\HeartSync-Mobile\UI_UX_Design`

Use `DESIGN_SYSTEM.md`, `previews/02_POLISHED_FULL_PREVIEW.png`, and
`previews/00_22_SCREENS_PREVIEW.jpg` first. The individual references below
are the 840 × 1820px PNGs in `screens/`. They are visual references only:
typed routes, repository contracts and confirmed backend state take precedence.

## Delivery plan

1. **Foundation** — replace the obsolete cyan system with the Pink Romance
   palette, component geometry, navigation chrome and truthful reference map.
2. **Auth and profile** — Welcome/onboarding, authentication, profile setup,
   profile, editing, interests and settings.
3. **Discovery and matching** — candidate deck, details, filters, confirmed
   match, saved profiles and empty discovery.
4. **Connection and safety** — matches, chat (light and dark treatment), call
   states, safety and report.
5. **QA** — static checks after each implementation batch; Expo development
   build and Android visual/accessibility comparison at the end.

## Honest status

`REWORK` means a working business screen exists but still follows the old cyan
direction and has not been checked against the listed Pink Romance reference.
`BUILD` means the visual concept has no corresponding route/screen yet.
`IMPLEMENTED — device QA pending` means code and static validation are done;
no screen below is visually complete until a device comparison is recorded.

| # | Reference | Product route / owner | Status |
| --- | --- | --- | --- |
| 01 | `01_welcome.png` | `Welcome` | IMPLEMENTED — device QA pending |
| 02 | `02_onboarding.png` | `Onboarding` | IMPLEMENTED — device QA pending |
| 03 | `03_login.png` | `SignIn` | IMPLEMENTED — device QA pending |
| 04 | `04_register.png` | `SignUp` / profile setup | IMPLEMENTED — device QA pending |
| 05 | `05_discover.png` | `Discover` | IMPLEMENTED — device QA pending |
| 06 | `06_profile_detail.png` | `OtherProfile` | REWORK |
| 07 | `07_filters_sheet.png` | `Filters` | REWORK |
| 08 | `08_match_found.png` | `MatchFound` | IMPLEMENTED — device QA pending |
| 09 | `09_saved.png` | `Saved` | IMPLEMENTED — device QA pending |
| 10 | `10_connections.png` | `Matches` | REWORK |
| 11 | `11_chat.png` | `Chat` | REWORK |
| 12 | `12_audio_ringing.png` | `IncomingCallOverlay` / `AudioCall` | REWORK |
| 13 | `13_audio_active.png` | `AudioCall` | REWORK |
| 14 | `14_video_call.png` | `VideoCall` | REWORK |
| 15 | `15_my_profile.png` | `Profile` | IMPLEMENTED — device QA pending |
| 16 | `16_edit_profile.png` | `EditProfile` | IMPLEMENTED — device QA pending |
| 17 | `17_interests.png` | `Interests` | IMPLEMENTED — device QA pending |
| 18 | `18_safety_center.png` | `Safety` | REWORK |
| 19 | `19_report.png` | Report flow | BUILD |
| 20 | `20_empty_discover.png` | `Discover` empty state | IMPLEMENTED — device QA pending |
| 21 | `21_settings.png` | `Settings` | IMPLEMENTED — device QA pending |
| 22 | `22_dark_chat.png` | Chat appearance treatment | BUILD |

## Foundation status

| Area | Status | Evidence |
| --- | --- | --- |
| Tokens, primitive geometry and navigation colours | IMPLEMENTED — device QA pending | `heartsync/src/shared/theme/tokens.ts`, `navigationTheme.ts` |
| Project design specification | IMPLEMENTED | `DESIGN.md` now maps to supplied Pink Romance direction |
| Full-screen visual QA | NOT STARTED | Requires Expo development build on an Android device or emulator |

## Guardrails that stay true through the redesign

- No fake profile, verification, online, unread, distance, match or call data.
- Public UI never shows date of birth or precise coordinates.
- Only `MatchRepository.recordSwipe` can initiate a Like/Pass and only a
  server-confirmed result opens Match Found.
- Chat subscriptions must clean up; LiveKit tokens only come from the trusted
  gateway/Edge Function.
- A report acknowledges intake, never claims the report was resolved.
