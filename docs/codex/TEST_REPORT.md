# HeartSync Test Report

| ID | Queue | Type | Command / evidence | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| DOC-01 | Pre-Q00 | Document extraction | Bundled Python `python-docx` / OOXML | Extract paragraphs and tables | SRS 30 tables, SDS 26 tables | PASS |
| DOC-02 | Pre-Q00 | PDF visual review | Poppler render plus page inspection | Inspect 13 reference pages | All 13 pages inspected | PASS |
| DOC-03 | Pre-Q00 | DOCX visual review | Packaged `render_docx.py` | Render page PNGs | `soffice.exe` unavailable | BLOCKED |
| Q00-INSTALL | Q00 | Reproducible install | `npm ci` | Clean install from lockfile | 468 packages installed/audited | PASS |
| Q00-TS | Q00 | TypeScript | `npx tsc --noEmit` | Exit 0 | Exit 0 | PASS |
| Q00-CONFIG | Q00 | Expo config | `npx expo config --type public` | Expected public identity | `HeartSync` / `heartsync` / `com.nhocbinhbo99.heartsync` | PASS |
| Q00-EXPO | Q00 | Expo health | `npx expo-doctor` | 20 checks pass | 20/20 after compatible patch updates | PASS |
| Q00-AUDIT | Q00 | Dependency security | `npm audit --json` read-only | Record current findings | 5 low, 3 high, 0 critical; forced fix would downgrade Expo | RISK |
| Q00-DEVICE | Q00 | Android device | Development build/device run | App opens as HeartSync | Not run | BLOCKED |
