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
`REBUILD IN PROGRESS` means the route works but the supplied Android runtime
screenshots show a material composition mismatch with the corresponding Pink
Romance reference. It is deliberately not treated as completed just because
tokens or colors were changed.
`IMPLEMENTED — service pending` means the UI is deliberate about an unavailable
backend action and never presents a false confirmation.

| # | Reference | Product route / owner | Status |
| --- | --- | --- | --- |
| 01 | `01_welcome.png` | `Welcome` | REBUILD IN PROGRESS — runtime mismatch recorded |
| 02 | `02_onboarding.png` | `Onboarding` | PENDING VISUAL AUDIT — no Android capture yet |
| 03 | `03_login.png` | `SignIn` | REBUILD IN PROGRESS — runtime mismatch recorded |
| 04 | `04_register.png` | `SignUp` / profile setup | PENDING VISUAL AUDIT — no Android capture yet |
| 05 | `05_discover.png` | `Discover` | REBUILD IN PROGRESS — runtime mismatch recorded |
| 06 | `06_profile_detail.png` | `OtherProfile` | PENDING VISUAL AUDIT — no Android capture yet |
| 07 | `07_filters_sheet.png` | `Filters` | PENDING VISUAL AUDIT — no Android capture yet |
| 08 | `08_match_found.png` | `MatchFound` | PENDING VISUAL AUDIT — no Android capture yet |
| 09 | `09_saved.png` | `Saved` | PENDING VISUAL AUDIT — no Android capture yet |
| 10 | `10_connections.png` | `Matches` | REBUILD IN PROGRESS — runtime mismatch recorded |
| 11 | `11_chat.png` | `Chat` | REBUILD IN PROGRESS — runtime mismatch recorded |
| 12 | `12_audio_ringing.png` | `IncomingCallOverlay` / `AudioCall` | REBUILD IN PROGRESS — runtime mismatch recorded |
| 13 | `13_audio_active.png` | `AudioCall` | REBUILD IN PROGRESS — runtime mismatch recorded |
| 14 | `14_video_call.png` | `VideoCall` | PENDING VISUAL AUDIT — no Android capture yet |
| 15 | `15_my_profile.png` | `Profile` | REBUILD IN PROGRESS — runtime mismatch recorded |
| 16 | `16_edit_profile.png` | `EditProfile` | REBUILD IN PROGRESS — runtime mismatch recorded |
| 17 | `17_interests.png` | `Interests` | PENDING VISUAL AUDIT — no Android capture yet |
| 18 | `18_safety_center.png` | `Safety` | PENDING VISUAL AUDIT — no Android capture yet |
| 19 | `19_report.png` | `Report` | PENDING VISUAL AUDIT — backend service still intentionally unavailable |
| 20 | `20_empty_discover.png` | `Discover` empty state | REBUILD IN PROGRESS — runtime mismatch recorded |
| 21 | `21_settings.png` | `Settings` | PENDING VISUAL AUDIT — no Android capture yet |
| 22 | `22_dark_chat.png` | `Chat` appearance treatment | PENDING VISUAL AUDIT — no Android capture yet |

## Foundation status

| Area | Status | Evidence |
| --- | --- | --- |
| Tokens, primitive geometry and navigation colours | IMPLEMENTED — device QA pending | `heartsync/src/shared/theme/tokens.ts`, `navigationTheme.ts` |
| Project design specification | IMPLEMENTED | `DESIGN.md` now maps to supplied Pink Romance direction |
| Full-screen visual QA | ROUND 1 BASELINE RECORDED | Twelve Android screenshots in `UI_UX_Design/runtime-screenshots/` identify the composition gaps above; the second capture occurs after the rebuild |

## Guardrails that stay true through the redesign

- No fake profile, verification, online, unread, distance, match or call data.
- Public UI never shows date of birth or precise coordinates.
- Only `MatchRepository.recordSwipe` can initiate a Like/Pass and only a
  server-confirmed result opens Match Found.
- Chat subscriptions must clean up; LiveKit tokens only come from the trusted
  gateway/Edge Function.
- A report acknowledges intake, never claims the report was resolved.
