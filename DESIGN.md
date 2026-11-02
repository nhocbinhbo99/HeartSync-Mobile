---
name: HeartSync
description: An Android-first system that makes connection state explicit and trustworthy.
colors:
  background: "#F6FAFB"
  surface: "#FFFFFF"
  surface-muted: "#EAF3F5"
  ink: "#102A33"
  ink-muted: "#587079"
  border: "#CFE0E4"
  primary: "#007E8C"
  primary-pressed: "#006674"
  primary-soft: "#DDF8FB"
  on-primary: "#FFFFFF"
  danger: "#C5364D"
  disabled: "#E3EAEC"
typography:
  display: { fontSize: "32px", fontWeight: 700, lineHeight: 1.219 }
  title: { fontSize: "22px", fontWeight: 700, lineHeight: 1.318 }
  subtitle: { fontSize: "17px", fontWeight: 600, lineHeight: 1.412 }
  body: { fontSize: "16px", fontWeight: 400, lineHeight: 1.5 }
  label: { fontSize: "14px", fontWeight: 600, lineHeight: 1.429 }
  caption: { fontSize: "13px", fontWeight: 400, lineHeight: 1.385 }
rounded: { md: "14px", lg: "22px", pill: "999px" }
spacing: { xs: "8px", sm: "12px", md: "16px", lg: "24px" }
components:
  button-primary: { backgroundColor: "{colors.primary}", textColor: "{colors.on-primary}", rounded: "{rounded.md}", padding: "12px 16px", height: "48px" }
  button-secondary: { backgroundColor: "{colors.surface}", textColor: "{colors.primary-pressed}", rounded: "{rounded.md}", padding: "12px 16px", height: "48px" }
  button-quiet: { backgroundColor: "transparent", textColor: "{colors.primary-pressed}", rounded: "{rounded.md}", padding: "12px 16px", height: "48px" }
  button-danger: { backgroundColor: "{colors.surface}", textColor: "{colors.danger}", rounded: "{rounded.md}", padding: "12px 16px", height: "48px" }
  text-input: { backgroundColor: "{colors.background}", textColor: "{colors.ink}", rounded: "{rounded.md}", padding: "0 16px", height: "52px" }
  state-panel: { backgroundColor: "{colors.surface}", textColor: "{colors.ink}", rounded: "{rounded.lg}", padding: "24px" }
  bottom-tabs: { backgroundColor: "{colors.surface}", textColor: "{colors.ink-muted}", height: "66px" }
  sync-line: { backgroundColor: "{colors.surface-muted}", rounded: "{rounded.pill}", height: "4px" }
---

# Design System: HeartSync

## Overview

**Creative North Star: “The Verified Connection.”** HeartSync uses restrained cyan signals on cool, quiet surfaces. The interface names empty, unavailable, error, and development states instead of filling space with fake profiles or simulated success.

The Q01 implementation is code-verified only. Insets, keyboard behavior, large fonts, TalkBack, tablet/landscape layout, and perceived color remain pending Android-device review.

**Key Characteristics:**

- Cool white and mist surfaces with one disciplined cyan accent.
- Dark, readable text and explicit state copy.
- Flat bordered containers instead of decorative card grids.
- Native stack and four-destination bottom navigation.
- Minimum 48 dp interactive targets.

## Colors

The palette uses cyan sparingly while cool neutrals carry most screen area.

**The Confirmed Signal Rule.** Cyan is reserved for a real action, selection, readiness, or confirmed state; it is not ambient decoration.

**The Semantic State Rule.** Error states combine danger color with explanatory text, never color alone.

## Typography

The system uses the React Native system typeface. Display is 32/39, title 22/29, subtitle 17/24, body 16/24, label 14/20, and caption 13/18.

**The Direct Hierarchy Rule.** Use a direct title and supporting body copy; do not manufacture hierarchy with repeated uppercase kickers.

## Layout

Portrait phone screens use a single scrollable column with 24 dp outer padding and 16 dp default vertical gaps. Forms and state panels use 24 dp internal padding. Signed-in destinations use a four-item bottom navigation; details use native-stack navigation and system Back.

**The Native Orientation Rule.** Navigation and Back behavior remain platform-native; branded surfaces must not replace orientation controls.

## Elevation & Depth

Depth comes from white surface contrast and 1 dp cool borders. No shadow token is defined.

**The Flat-by-Default Rule.** Do not add shadows unless a future interaction requires real elevation and a deliberate token is added.

## Shapes

Interactive controls use 14 dp corners; state panels use 22 dp. Pill geometry is reserved for continuous tracks such as progress or readiness.

## Components

### Buttons and fields

Buttons have a minimum 48 dp target. Primary is filled cyan; secondary and danger are outlined; quiet has no visible container. Disabled buttons use a pale neutral surface and dark label while the native disabled state removes interaction. Text fields are at least 52 dp high, label their input accessibly, and expose an error message through a live region. Focus and full disabled field treatments remain future work.

### State panels

`AsyncStatePanel` is the shared loading/empty/error contract. `StatePanel` carries development or informational copy with a direct title, explanation, and optional safe action.

### Navigation

Primary destinations are Khám phá, Đã lưu, Kết nối, and Hồ sơ. Detail screens use native-stack headers and Android system Back. A session-aware route gate exposes the main shell only after Supabase reports an authenticated session; missing configuration has its own setup-required state.

### Sync Line

The 4 dp Sync Line is reserved for real loading, selection, or readiness state. It must never display fabricated progress; Q01 does not place it on the auth screen.

## Do's and Don'ts

### Do:

- **Do** keep actions and explanations together within thumb reach.
- **Do** preserve 48 dp minimum touch targets and native Back behavior.
- **Do** use explicit empty, unavailable, error, and development copy.
- **Do** prefer borders and tonal layering before introducing shadows.

### Don't:

- **Don't** claim authentication, profiles, matches, realtime activity, or calls before server confirmation.
- **Don't** repeat uppercase kickers or use-case identifiers as the primary production hierarchy; the Q01 placeholder labels are temporary traceability aids.
- **Don't** use cyan as ambient decoration or display fabricated Sync Line progress.
- **Don't** treat device behavior as approved until Android smoke and accessibility tests are recorded.
