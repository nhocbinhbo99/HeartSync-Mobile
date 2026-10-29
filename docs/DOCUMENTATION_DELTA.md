# HeartSync Documentation Delta

## Baseline reviewed

This comparison is based on the files actually present in `docs/reference/` on 29 October 2026:

- `HeartSync_SRS_v1.3.docx`: 1 actor, 19 use cases, 37 functional requirements, 12 business rules, and 12 non-functional requirements.
- `HeartSync_SDS_v1.3.docx`: proposed architecture and data model; diagrams are intentionally placeholders and are not implementation evidence.
- `dating_app.pdf`: 13 UI reference pages. It contains image-only mockups and is UX reference, not proof of implemented behavior.

DOCX content was extracted in document order, including tables and raw OOXML text. PDF pages were rasterized and all 13 pages were inspected. DOCX visual rendering is not verified because the bundled runtime has no LibreOffice `soffice.exe`; this limitation does not prevent content-level comparison.

## Actor and use case inventory

The single actor is **Người dùng**. Authentication is a precondition/state, not a second actor.

| UC | Name | Authentication precondition | Base implementation decision | Q00 status |
|---|---|---|---|---|
| UC01 | Đăng ký | Not signed in | Supabase Auth boundary | Not started |
| UC02 | Đăng nhập | Not signed in | Supabase Auth session | Not started |
| UC03 | Quên mật khẩu | Not signed in | Auth reset plus verified deep link | Not started |
| UC04 | Đăng xuất | Signed in | Revoke local session access | Not started |
| UC05 | Quản lý hồ sơ cá nhân | Valid session and owned profile | Owner-only profile/storage access | Not started |
| UC06 | Thiết lập bộ lọc | Signed in | Persist validated preferences; location requires consent | Not started |
| UC07 | Khám phá hồ sơ | Signed in; profile eligible | Public-field projection/RPC; exclude self/swiped/blocked | Not started |
| UC08 | Xem chi tiết hồ sơ | Signed in; target accessible | Public fields only | Not started |
| UC09 | Thích hồ sơ | Signed in; target eligible; no duplicate active like | Atomic server RPC records like, checks reverse like, creates at most one match | Not started |
| UC10 | Bỏ qua hồ sơ | Signed in; target eligible | Persist pass without match | Not started |
| UC11 | Lưu / Bỏ lưu hồ sơ | Signed in; non-self target | Owner-only unique bookmark | Not started |
| UC12 | Xem hồ sơ đã lưu | Signed in | Owner-only list | Not started |
| UC13 | Xem danh sách kết đôi | Signed in | Only participant-visible matches | Not started |
| UC14 | Hủy kết đôi | Signed in; active match | Server transition revokes new chat/call | Not started |
| UC15 | Nhắn tin trực tuyến | Signed in; active match participant | Database is source of truth; Realtime deduplicates by message ID | Not started |
| UC16 | Gọi thoại | Signed in; active match; device/media available | Server-issued short-lived LiveKit token; real-device verification required | Not started |
| UC17 | Gọi video | Signed in; active match; camera/mic permission | Same authorization boundary as audio plus video permission/track | Not started |
| UC18 | Chặn người dùng | Signed in; non-self target | One-way block prevents new discovery/match/chat/call interactions | Not started |
| UC19 | Báo cáo người dùng | Signed in; valid target | Private intake record; no Admin actor/UI implied | Not started |

UC09 contains the two required internal processing steps, reverse-like verification and atomic match creation. They must not be restored as separate use cases.

## Core rules that implementation must preserve

| Source | Requirement | Implementation direction | Verification needed |
|---|---|---|---|
| BR-01 | No self Like, Save, Match, or Block | SQL checks plus RPC validation | Negative SQL tests |
| BR-02/03 | One-way Like is not a Match; concurrent mutual Likes create at most one Match | Canonical UUID pair, unique constraint, transactional RPC | Concurrent/idempotency tests |
| BR-04/05 | Unmatch/Block prevents new Chat/Call; only active Match participants may access them | RLS and server authorization | A/B/C access tests |
| BR-06 | Profile, photos, preferences, and bookmarks are owner-controlled | RLS and Storage policies | Cross-user write denial |
| BR-07 | Discovery must not expose email, tokens, or precise coordinates | Public projection/view or RPC; private location separated | Column exposure review |
| BR-08 | Success only after backend confirmation | Typed results; no optimistic phantom Match/message/call | Unit and integration tests |
| BR-09 | Filters apply age/gender/language and distance only with valid location | Validated filters and explicit location permission | Unit plus device permission tests |
| BR-10 | Call becomes connected only after accept and media connection | Finite call state machine driven by LiveKit events | Two-device test |
| BR-11 | Report submission does not mean violation confirmed | Intake status only | Contract/unit test |
| BR-12 | Users are 18+ | Queue resolves the SRS conditional wording: enforce server-side | SQL/domain validation tests |

## Document versus implementation delta

| Document area | Document statement or gap | Verified source baseline | Decision / expected change to SRS or SDS |
|---|---|---|---|
| SRS Ch. 4-5 | One actor and 19 UC | Correct and retained | Keep; UC09 remains a single use case with internal match steps |
| SRS BR-12 | 18+ only “if the group finalizes” | No implementation exists | Queue finalizes 18+; update wording after server validation is implemented |
| SDS Ch. 3 diagrams | Architecture, UML, sequences, ERD are placeholders | No diagrams implemented in source | Draw from verified migrations/contracts, not the placeholder field list |
| SDS Ch. 4 schema | UUID schema is proposed | Source had no Supabase directory/migration at Q00 | Q03 migrations become the implementation authority; then update exact columns, nullability, enums, and delete behavior |
| SDS Ch. 4.4 | Re-match after unmatch is undecided | No implementation exists | Must be explicitly decided before Q03 migration is finalized |
| SRS UC14/18 | History and in-progress call behavior after unmatch/block is unresolved | No implementation exists | Define state transitions and read-history policy; always deny new message/call creation |
| SDS Ch. 4.5 | RLS protects private data | RLS is row-level, not column-level | Use a controlled public projection/RPC or separated private table for DOB/location; document exact grants |
| SDS Ch. 5.2 | Atomic `record_swipe` RPC proposed | No RPC exists | Q03 must use `auth.uid()`, fixed `search_path`, canonical pair, unique constraint, and restricted execute grants |
| SDS Ch. 5.3 | Realtime Chat | No chat source exists | Database remains source of truth; subscriptions merge by `message.id` and must be cleaned up |
| SDS Ch. 5.4 | LiveKit token from Edge Function | No LiveKit integration exists | Secret stays server-side; token bound to authorized call/room/identity/TTL |
| SDS Ch. 6 | Main tabs Profile, Discovery, Saved, Matches | Source was default Expo screen | Queue chooses typed React Navigation shell; route names will be recorded after Q01 |
| UI reference pages | Apple/Facebook/phone auth, Premium, mini-game, verification | Outside agreed base scope | Do not implement or claim these features; retain only useful layout/interaction cues |
| UI reference location | Displays exact distance/address | Precise coordinates are private and no GPS exists | Do not show real-looking distance without valid permission/data; expose only approved public location text |

## Decisions requiring leader review

1. Confirm `com.nhocbinhbo99.heartsync` before the first EAS/Play Store linkage.
2. Decide whether a previously unmatched pair may match again and whether swipe state is current-state or event history before Q03 is approved.
3. Decide whether old chat history remains readable after unmatch/block; new messages and calls will be denied regardless.
4. Approve public profile fields and whether birth date/location live in a separate private table before remote migrations are applied.
5. Approve maximum photo count, file limits, and Storage bucket visibility before profile upload is considered complete.
