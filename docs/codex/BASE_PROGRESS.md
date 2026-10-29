# HeartSync Base Progress

## Current checkpoint

Q00 and Q01 are complete. The verified project root is the Git repository `HeartSync-Mobile`; the Expo application lives at `heartsync/`. Q02 is the next queue checkpoint.

| Area | Implemented | Tested locally | Tested on Android | Requires user | Next owner |
|---|---|---|---|---|---|
| Repository naming | App directory and Expo/npm identity updated | `npm ci`, TypeScript, Expo config, Expo Doctor | No | Confirm Android application ID before EAS link | Công |
| SRS/SDS comparison | 19 UC, rules, risks, and open decisions recorded | Content extraction verified | N/A | Resolve schema/history decisions | Công + team |
| Navigation shell + theme | Typed native stack, four bottom tabs, auth entry routes, detail placeholders, shared controls/states | TypeScript, ESLint, Expo Doctor, Android production bundle | No | Run visual/back/keyboard smoke test | Công |
| Auth/Data/Call services | No | No | No | Future queue/cloud/device steps | Q02-Q06 owners |

## Evidence and limitations

- SRS/SDS tables and OOXML text were extracted successfully.
- All 13 PDF mockup pages were rendered and inspected.
- DOCX visual rendering is blocked by missing LibreOffice in the bundled runtime; content extraction succeeded.
- No Android device test has been run.
- No Supabase project, remote migration, EAS build, or LiveKit project has been created or changed.

## Q01 validation

- `npm run typecheck`: PASS.
- `npm run lint`: PASS with no warnings after Expo flat-config setup.
- `npx expo-doctor`: PASS, 20/20 after adding the required `expo-font` peer for `expo-symbols`.
- `npx expo config --type public`: PASS; predictive Android back gesture enabled.
- `npx expo export --platform android --output-dir tmp/q01-export-final`: PASS outside the sandbox; 915 modules bundled to 2.1 MB Hermes bytecode. Generated output was removed after verification.
- Emulator/device visual, system Back, keyboard, and TalkBack smoke tests remain BLOCKED because no Android target is connected in this session.

## Q00 validation

- Installed versions after Expo compatibility repair: Expo `~58.0.21`, Expo Dev Client `~58.0.17`, React Native `0.88.1`, React `19.3.0`, TypeScript `~6.0.3`.
- `npm ci`: PASS, 468 packages installed/audited.
- `npx tsc --noEmit`: PASS.
- `npx expo config --type public`: PASS; name `HeartSync`, slug `heartsync`, Android package `com.nhocbinhbo99.heartsync`.
- `npx expo-doctor`: PASS, 20/20 after applying patch-level versions recommended by Expo.
- `npm audit --json`: command completed with expected nonzero vulnerability status; 8 findings (5 low, 3 high, 0 critical). The only offered automatic resolution downgrades Expo to 51, so no forced fix was applied.
