---
name: HeartSync
description: A warm, clear dating experience that makes real connection feel safe and approachable.
colors:
  background: "#FFF7F9"
  surface: "#FFFFFF"
  surface-muted: "#FFF0F4"
  ink: "#3B1024"
  ink-muted: "#816776"
  border: "#F2D7E3"
  primary: "#FF4D7D"
  primary-pressed: "#E6386F"
  primary-soft: "#FFD6E1"
  success: "#159967"
  danger: "#D93A4F"
  call-backdrop: "#36112A"
typography:
  display: { fontSize: "32px", fontWeight: 700, lineHeight: 1.188 }
  heading: { fontSize: "28px", fontWeight: 700, lineHeight: 1.214 }
  title: { fontSize: "22px", fontWeight: 600, lineHeight: 1.273 }
  body: { fontSize: "16px", fontWeight: 400, lineHeight: 1.5 }
  label: { fontSize: "16px", fontWeight: 600, lineHeight: 1.25 }
rounded: { field: "14px", button: "14px", card: "20px", pill: "999px" }
spacing: { xxs: "4px", xs: "8px", sm: "12px", md: "16px", lg: "24px", xl: "32px", xxl: "40px" }
---

# HeartSync Design System — Pink Romance

## Source of truth

The current visual source is the user-provided `UI_UX_Design/` package, in
particular its `DESIGN_SYSTEM.md`, 22 screen PNGs and preview boards. Its
static mockups guide visual hierarchy and interaction intent; the typed route
graph, service contracts and real server state remain the source of truth for
application behaviour.

## Visual direction

HeartSync is bright, warm and calm. Portrait photography is the focus on
Discovery; white surfaces, light-pink borders and restrained heart motifs frame
real content elsewhere. One primary pink action per task is enough. Do not
invent verified, online, unread, distance, call-duration or match signals when
the application has not received that data from its backend.

Use `#FF6D9B → #DC2B67` only for one primary hero or CTA treatment on a screen,
never behind small form or chat text. Avoid decorative blur, repeated nested
cards and arbitrary icon clusters. App icons use the existing single, semantic
icon system—not Unicode or emoji substitutes.

## Tokens and type

The runtime tokens in `heartsync/src/shared/theme/tokens.ts` implement the
palette in this document. The default typeface is Inter where it is configured,
with the system typeface as a resilient fallback. Type scale: display 32/38,
heading 28/34, title 22/28, subtitle 18/24, body 16/24, button/label 16/20 and
caption 12/16. Important copy must not be smaller than 12sp and must tolerate
system font scaling.

Screen gutters are 20–24dp. Use the 4/8/12/16/24/32/40 spacing scale. Inputs
are at least 52dp high; primary buttons are 52–56dp high; all practical touch
targets are at least 48dp. Inputs use 12–14dp corners; cards use 16–24dp;
chips use a pill shape.

## Navigation and screens

Before sign-in, guide people through Welcome, optional Onboarding, Login,
Register and password recovery. After sign-in, the four core destinations are
Khám phá, Đã lưu, Kết nối and Hồ sơ. Contextual routes contain profile details,
filters, a confirmed match, chat, calls, edit profile, interests, settings,
safety and report flows. Filters are a bottom sheet; chat keeps its composer
visible above the keyboard; detail screens use native-stack Back behavior.

The detailed implementation map, reference image names and honest delivery
status are maintained in `docs/ui-redesign/PROGRESS.md`.

## Real-state rules

- Screens call repository or gateway contracts; they do not call Supabase,
  Realtime or LiveKit directly.
- Public profile UI never renders date of birth, precise location, email or
  credentials. Age and public location come only from public DTOs.
- A matched reveal appears only for a server-confirmed `matched` result with a
  non-empty `matchId`; the client never creates a match.
- Saved state, unread counts, call state and report feedback are backed by
  their real contracts. Missing capability is a clear unavailable state, not a
  mock success state.
- Camera, microphone and location permissions are requested only in the action
  that needs them.

## Component contracts

Shared components cover the visual vocabulary: `AppButton`, `IconButton`,
`AppTextField`, `SelectedChip`, `Avatar`, `ChoiceBottomSheet`,
`AsyncStatePanel`, `Snackbar`, message bubbles, call controls and profile photo
grid. A component earns extraction only when it represents a reusable semantic
pattern. Every icon-only action has a spoken label; selected controls have a
non-colour indicator; form errors identify the problem and recovery.

## States, motion and accessibility

Every screen needs loading, empty, error, disabled and populated states as
applicable. Error copy is concise and actionable; raw provider errors never
reach users. Text contrast meets WCAG AA (4.5:1 normal text; 3:1 large text).

Motion is short and purposeful: screen entry 180–240ms, message arrival
120–180ms, swipe spring 220–350ms, match reveal 400–650ms, and bottom-sheet
open/close 220–300ms. Honour system reduced-motion settings. Haptics occur
only when a meaningful selection, threshold swipe or server-confirmed action
completes.

## Device QA

Validate at 360–430dp widths, with Android navigation bar, safe areas, large
font scale and keyboard shown. The provided PNGs are concept references—not a
reason to hardcode device dimensions, copy their illustrative identity badges,
or include their model photographs as application data. Record real-device
comparison and accessibility evidence in the progress log before calling a
screen visually complete.
