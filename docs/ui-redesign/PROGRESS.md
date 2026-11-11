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
| HeartSync v3 tokens and shared primitives | DONE | Static review; Android device review pending | `typecheck`, `lint`, and Jest passed | `2dbae7c` | Semantic colors, type roles, 48 dp targets, state panels, avatar, and section headers. |

## Screen mapping

| Screen / flow | Route or source | Reference image | Status | Visual QA | Commit | Notes |
| --- | --- | --- | --- | --- | --- |
| Session loading | `AuthLoading` | Missing | DONE | Static review; Android device review pending | `fccb6f1` | Preserve current session gate. |
| Setup required | `SetupRequired` | Missing | DONE | Static review; Android device review pending | `fccb6f1` | Never use fake Supabase settings. |
| Sign in | `SignIn` | Missing | DONE | Static review; interaction test added; Android device review pending | `fccb6f1` | PKCE behavior remains unchanged. |
| Sign up | `SignUp` | Missing | DONE | Static review; Android device review pending | `fccb6f1` | 18+ validation stays server-backed. |
| Forgot password | `ForgotPassword` | Missing | DONE | Static review; Android device review pending | `fccb6f1` | Preserve recovery deep link flow. |
| Update password | `UpdatePassword` | Missing | DONE | Static review; Android device review pending | `fccb6f1` | Preserve authenticated recovery state. |
| Profile setup | `ProfileSetup` | Missing | DONE | Static review; Android device review pending | `be8d86a` | Reuses private profile editor. |
| Discover | `Discover` | Missing | DONE | Static review; Android device review pending | `1bc7358` | Candidate DTO stays public-only. |
| Filters | `Filters` | Missing | DONE | Static review; Android device review pending | `e257dd9` | Keep explicit location consent. |
| Other profile | `OtherProfile` | Missing | DONE | Static review; Android device review pending | `8a43257` | No DOB or exact coordinates. |
| Like / pass / match | `Discover`, `MatchFound` | Missing | DONE | Static review; Android device review pending | `1bc7358` and `e7e695f` | Match confirmation and Discover controls preserve atomic server RPC. |
| Saved profiles | `Saved` | Missing | DONE | Static review; Android device review pending | This commit | Optimistic removal must retain rollback. |
| Matches list | `Matches` | Missing | TODO | Pending | — | Show only active server-authorized matches. |
| Conversation | `Chat` | Missing | TODO | Pending | — | Keep Realtime cleanup and message dedupe. |
| Incoming call | `IncomingCallOverlay` | Missing | TODO | Pending | — | Keep call authorization state explicit. |
| Voice call | `AudioCall` | Missing | TODO | Pending | — | Connected is a real media event only. |
| Video call | `VideoCall` | Missing | TODO | Pending | — | Camera/mic permission state remains real. |
| My profile | `Profile` | Missing | DONE | Static review; Android device review pending | `4690e5a` | Keep private/public separation. |
| Edit profile | `EditProfile` | Missing | DONE | Static review; Android device review pending | `d586b1b` | Keep storage/photo lifecycle. |
| Safety | `Safety` | Missing | DONE | Static review; Android device review pending | `ff1e162` | Block/report contracts stay unchanged. |

## QA constraints

- No Android emulator or connected device has been verified in this session.
- Visual comparison against the requested mockups is blocked only by the absent
  `UI_UX_Design/` source assets; static type/lint/test checks continue per
  screen.
