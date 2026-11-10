# HeartSync UI Redesign Progress

## Reference inventory

`UI_UX_Design/` (including `DESIGN_SYSTEM.md`, `screens/`,
`screens_illustrated/`, and `previews/`) is not present in this worktree. No
reference PNG exists to map or use for screenshot comparison. The redesign uses
the checked-in `DESIGN.md` and existing React Navigation routes until the design
folder is supplied. This is recorded as a visual-QA constraint, not a reason to
replace any real backend state with fixtures.

## Design system foundation

| Area | Status | Visual QA | Validation | Commit | Notes |
| --- | --- | --- | --- | --- | --- |
| HeartSync v3 tokens and shared primitives | DONE | Static review; Android device review pending | `typecheck`, `lint`, and Jest passed | This commit | Semantic colors, type roles, 48 dp targets, state panels, avatar, and section headers. |

## Screen mapping

| Screen / flow | Route or source | Reference image | Status | Visual QA | Commit | Notes |
| --- | --- | --- | --- | --- | --- |
| Session loading | `AuthLoading` | Missing | TODO | Pending | — | Preserve current session gate. |
| Setup required | `SetupRequired` | Missing | TODO | Pending | — | Never use fake Supabase settings. |
| Sign in | `SignIn` | Missing | TODO | Pending | — | PKCE behavior remains unchanged. |
| Sign up | `SignUp` | Missing | TODO | Pending | — | 18+ validation stays server-backed. |
| Forgot password | `ForgotPassword` | Missing | TODO | Pending | — | Preserve recovery deep link flow. |
| Update password | `UpdatePassword` | Missing | TODO | Pending | — | Preserve authenticated recovery state. |
| Profile setup | `ProfileSetup` | Missing | TODO | Pending | — | Reuses private profile editor. |
| Discover | `Discover` | Missing | TODO | Pending | — | Candidate DTO stays public-only. |
| Filters | `Filters` | Missing | TODO | Pending | — | Keep explicit location consent. |
| Other profile | `OtherProfile` | Missing | TODO | Pending | — | No DOB or exact coordinates. |
| Like / pass / match | `Discover`, `MatchFound` | Missing | TODO | Pending | — | Match screen only after server-confirmed ID. |
| Saved profiles | `Saved` | Missing | TODO | Pending | — | Optimistic removal must retain rollback. |
| Matches list | `Matches` | Missing | TODO | Pending | — | Show only active server-authorized matches. |
| Conversation | `Chat` | Missing | TODO | Pending | — | Keep Realtime cleanup and message dedupe. |
| Incoming call | `IncomingCallOverlay` | Missing | TODO | Pending | — | Keep call authorization state explicit. |
| Voice call | `AudioCall` | Missing | TODO | Pending | — | Connected is a real media event only. |
| Video call | `VideoCall` | Missing | TODO | Pending | — | Camera/mic permission state remains real. |
| My profile | `Profile` | Missing | TODO | Pending | — | Keep private/public separation. |
| Edit profile | `EditProfile` | Missing | TODO | Pending | — | Keep storage/photo lifecycle. |
| Safety | `Safety` | Missing | TODO | Pending | — | Block/report contracts stay unchanged. |

## QA constraints

- No Android emulator or connected device has been verified in this session.
- Visual comparison against the requested mockups is blocked only by the absent
  `UI_UX_Design/` source assets; static type/lint/test checks continue per
  screen.
