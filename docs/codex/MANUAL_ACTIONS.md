# HeartSync Manual Actions

Do not paste credentials or secrets into chat, Git, screenshots, or these logs.

## Q00 review

- [ ] **Confirm Android application ID:** approve `com.nhocbinhbo99.heartsync` before the first EAS project link or Play Store upload. Verification: `npx expo config --type public` reports the approved `android.package`.
- [ ] **Keep the existing `.claude` deletion decision:** `mobile/.claude/settings.json` was already deleted before Q00. The rename commit preserves its baseline at `heartsync/.claude/settings.json`, while the pre-existing deletion remains unstaged. Decide separately whether that plugin setting should remain deleted.

## Later checkpoints (do not perform yet)

- [ ] Create the Supabase development project and keep URL/publishable key only in `heartsync/.env` after Q02 documents the variables.
- [ ] Review and explicitly approve SQL migrations before any remote apply in Q03/Q05.
- [ ] Create/link EAS and LiveKit projects only after Q06 compatibility review; keep LiveKit API secret server-side.
- [ ] Run acceptance tests on at least two physical Android devices before claiming Chat/Audio/Video verification.
