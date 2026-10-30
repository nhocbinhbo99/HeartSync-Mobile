# HeartSync Setup Manual

These instructions target Windows PowerShell, an Android development device, Expo/EAS, and a development-only Supabase project. Never paste project secrets into Git, chat, screenshots, or the Expo client.

## 1. Install and verify locally

Open PowerShell at the repository root (the folder containing `heartsync`, `supabase`, and this `docs` folder):

```powershell
Set-Location .\heartsync
node --version
npm --version
npm ci
npm run typecheck
npm run lint
npm test -- --ci
npx expo-doctor
```

Expected base: Node can run the Expo SDK 58 toolchain, install follows `package-lock.json`, TypeScript/ESLint exit 0, and Jest reports 46 tests or more. Do not use `npm audit fix --force`; the current suggested fix is an incompatible Expo downgrade.

## 2. Configure a development Supabase project

1. Create a separate development project in the [Supabase dashboard](https://supabase.com/dashboard). Choose the closest available region to intended testers and record the region in the team checklist.
2. In **Connect**, copy only the Project URL and publishable key.
3. From `heartsync/`, create the ignored local file:

```powershell
Copy-Item .env.example .env
notepad .env
```

4. Replace the two placeholders. Never put database passwords, `service_role`, `sb_secret`, or LiveKit API secrets in an `EXPO_PUBLIC_*` variable.
5. In **Authentication → Providers → Email**, record whether confirmation is required.
6. In **Authentication → URL Configuration → Additional Redirect URLs**, add exactly:

```text
heartsync://auth/callback
heartsync://auth/recovery
```

The app intentionally shows Setup Required when environment values are missing; it never falls back to demo credentials or data.

## 3. Review and run Supabase locally

Q03 is not yet applied. First read `DATA_MODEL.md`, `ARCHITECTURE.md`, and all files under `supabase/migrations/`. Start Docker Desktop and wait for its Linux engine to become healthy. Install Supabase CLI using an official, inspectable method; do not pipe a remote script directly to a shell.

From the repository root:

```powershell
supabase --version
docker info
supabase start
supabase db reset
supabase test db
supabase db lint
supabase gen types typescript --local
```

Do not link or push to a remote project until the team reviews local reset, pgTAP, lint, generated types, target project reference, and recovery plan. Never test destructive SQL against production/shared data.

## 4. Android development build

Confirm `android.package` in `heartsync/app.json` before linking EAS. Then from `heartsync/`:

```powershell
npx eas-cli login
npx eas-cli project:init
npx eas-cli build --profile development --platform android
```

Cloud login/link/build are manual because they modify the user's Expo account and may use build quota. Install the resulting development APK on a physical Android device. If Metro LAN discovery fails, use:

```powershell
npx expo start --dev-client --tunnel
```

For ordinary LAN testing:

```powershell
npx expo start --dev-client
```

Verify sign-up, confirmation policy, sign-in failure/success, app restart/session restore, sign-out, password reset callback, Android Back, keyboard/insets, large font, and TalkBack. Use synthetic test identities and non-personal images.

## 5. LiveKit preparation (Q06 boundary)

Do not add LiveKit secrets to `.env` or build a token in the client. If the team chooses LiveKit Cloud, create the project manually, retain URL/API credentials server-side, and expose only a Supabase Edge Function that validates the caller, active match, room, identity, and short TTL. A compile-successful development build is not proof of two-way media; acceptance requires two physical Android devices.

## Troubleshooting

- `npm ci` returns `EPERM`: close Metro/editors using `node_modules`, retry from a normal PowerShell, and check antivirus locking. Do not delete unrelated folders.
- Supabase callback opens a browser only: confirm a development build is installed and both exact custom-scheme redirects are allowed.
- Docker/Supabase commands fail: keep Q03 `SQL_PREPARED_NOT_APPLIED`; do not substitute a remote production database.
- Tunnel is slow: return to LAN once both devices can reach the development machine.
