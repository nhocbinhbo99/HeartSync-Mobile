---
version: 1
slug: "heartsync-app-tsx"
primary_target: "heartsync/App.tsx"
related_targets: []
---

# HeartSync App Shell

Mode: Operate. Scope: the Android base shell, authentication entry screens, four primary destinations, and development placeholders for detail flows.

Audience and task: an adult user should immediately understand whether a screen is ready, empty, unavailable, or still under development and should always have one obvious safe next action. The shell must also expose stable routes for Công, Minh, and Hảo without pretending backend features work.

## Direction contract

THESIS: HeartSync makes a first conversation feel personal and low-pressure. It rejects the old cyan utility shell and a recolour-only implementation: the supplied Pink Romance references define each screen's composition, while live data defines which profile, message, location, badge, or call state may appear.

OWN-WORLD: Pink Romance uses a pale rose canvas (#FFF7F9), white task surfaces, deep plum type (#3B1024), and one confident pink action (#FF4D7D). A large photo is the content when the service supplies one; otherwise a purpose-built, quiet empty illustration replaces it. Primary controls are 52–56dp, outlined controls stay white, and the four-item bottom navigation uses a pink selected container rather than a generic tint. There are no fake verification, presence, unread, distance, match, or call claims.

STORY: The first-time visitor gets a memorable welcome and a clear account path. A signed-in person sees one dominant candidate, real conversations with a readable hierarchy, and their own profile as a portrait-led identity page. Empty, loading, error, and unavailable states stay equally deliberate without pretending that backend data exists.

FIRST VIEWPORT: Welcome is a drenched-rose introduction with concentric artwork, a display wordmark, one filled CTA and a legible secondary account action. Discover starts with a direct title and filters, then gives the candidate photo almost all available height; its empty state uses the same visual weight. Connections leads with recent matches horizontally and message rows below. Profile places name and public metadata on a photo scrim. Chat holds a compact recipient bar and a fixed rose composer above the Android IME.

FORM: Code-led Android Operate surface using the user-pinned `UI_UX_Design/screens` Pink Romance references; `seed: none (unavailable)`. Material-safe navigation, touch targets, Back behaviour and keyboard insets remain intact; the visual world owns hierarchy, density, image treatment, controls and truthful states.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Constraints: Android-first portrait base, 48 dp targets, safe-area and keyboard handling, system Back, no fake profiles or success states, no dependency on Supabase configuration for Q01, and no new copyrighted image assets.
