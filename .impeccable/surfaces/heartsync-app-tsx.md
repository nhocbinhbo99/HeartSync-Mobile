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

THESIS: HeartSync presents connection as a verified state, not a romantic promise. It refuses the category default of photo-first mockups that imply working data before the backend exists.

OWN-WORLD: White and cool mist surfaces carry a disciplined cyan signal, charcoal text, and restrained status colors. Standard Android navigation and controls stay familiar; rounded surfaces are reserved for controls and state panels, not used as a grid of decorative cards. The signature move is a thin Sync Line that changes only with actual loading, selection, or readiness.

STORY: The user sees the current destination, its honest state, and the action that can be taken now. Auth, discovery, saved profiles, matches, profile, and detail routes use one vocabulary for loading, empty, error, and development states.

FIRST VIEWPORT: A compact Android top app bar establishes screen context, the main content begins with a direct title and state-specific copy, and any primary action follows the explanation within thumb reach. Signed-in destinations use a four-item Material-style bottom navigation bar; detail screens use native-stack Back behavior.

FORM: Code-led Operate surface using the queue-pinned HeartSync reference direction; `seed: none (unavailable)`. Standard platform layout owns navigation and controls; the world contributes palette, density, type roles, and the Sync Line.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Constraints: Android-first portrait base, 48 dp targets, safe-area and keyboard handling, system Back, no fake profiles or success states, no dependency on Supabase configuration for Q01, and no new copyrighted image assets.
