# Báo cáo kiểm thử Gemini AI

## Kết quả thực tế

| Nhóm | Trạng thái | Minh chứng |
|---|---|---|
| TypeScript | PASS | `npm.cmd run typecheck`, exit 0. |
| ESLint full app | PASS | `npm.cmd run lint`, exit 0. |
| Jest full app regression | PASS | 27 suites / 109 tests / exit 0. |
| AI unit (client parser/repository) | PASS | 2 suites / 15 tests / exit 0. |
| AI migration static security | PASS | `static_migration_checks.ps1`, exit 0; source-only check. |
| Client secret scan | PASS | No `GEMINI_API_KEY` or key-shaped Gemini value under `heartsync/`. |
| Edge Function Deno unit | PASS | `npx.cmd --yes deno test supabase/functions/ai-assistant/gemini.test.ts`: 4 passed / 0 failed. |
| Supabase local pgTAP | BLOCKED_MANUAL | Docker daemon unavailable. |
| Gemini live API | PENDING_MANUAL | Server secret was configured by owner; an authenticated Android request must still display real Gemini output before this can be PASS. |
| Supabase remote migration/function | PASS (repair/deploy) | Authorized repair applied with `db query --remote`, constraints verified read-only, Function deployed twice, JWT gateway verified 401, and authenticated reservation probe passed with rollback. |
| Android device smoke | BLOCKED_MANUAL | No Android development build/device session provided. |

Không có kết quả mock nào được ghi là live Gemini hoặc remote Supabase.

## Cập nhật integration remote — 11/11/2026

| Hạng mục | Trạng thái | Minh chứng / bước tiếp theo |
|---|---|---|
| Active Match authorization helper | PASS (owner SQL diagnosis) | Với Match mới, `auth.uid()` đã trùng actor mô phỏng và `private.can_use_active_match(match_id) = true`. Không phải lỗi dữ liệu Match/block/helper. |
| PostgREST RPC refresh | PENDING_MANUAL | Migration đã được áp dụng remote trước khi có `notify pgrst`; owner cần chạy `notify pgrst, 'reload schema';` trong SQL Editor. |
| Function RPC/provider error classification | PASS (source), PENDING_MANUAL deploy | Function local chỉ map SQLSTATE `42501` sang Match-not-allowed; lỗi RPC, Gemini provider, key/model config và output khác là 503 + log tối thiểu. HTTP Gemini `400/401/403/404` được map `GEMINI_CONFIGURATION_ERROR`; Deno unit mới viết nhưng chưa thực thi. Cần owner deploy để có hiệu lực remote. |
| Regression after diagnostic change | PASS | `npm.cmd run typecheck` và `npm.cmd run lint`, exit 0. Không có Deno/runtime remote claim. |
| Icebreaker reserve regression root cause | PARTIAL / PENDING_DIAGNOSIS | Source audit xác nhận initial date-regex defect và owner xác nhận repair `[0-9]` đã có trên remote. Tuy nhiên retest vẫn trả `reserve_quota / 23514`; cần deploy Function diagnostic mới nhất để log allow-listed `constraint`, rồi thực hiện smoke test trước khi có thể đánh dấu PASS. |
| Icebreaker remote smoke after diagnostic deploy | PARTIAL | Dashboard shows a fresh Function boot and one HTTP 200. It may be quota loading rather than generation; acceptance requires three visible suggestions and no 503 for the generation request. |
| Edge Function syntax after safe fallback | PASS (syntax only) | TypeScript transpile completed without diagnostics. Deno unit and remote generation remain pending. |
| Production Icebreaker quota reservation | PASS (integration, rolled back) | Remote `reserve_ai_request` with the validated user/active Match returned `reserved`. Transaction was rolled back, so it did not consume quota or leave a request. |
| Production Function JWT gateway | PASS (integration) | Unauthenticated POST returned HTTP 401 `UNAUTHORIZED_NO_AUTH_HEADER`; `verify_jwt` remains enabled. |
| Live Gemini + Android UI | PENDING_MANUAL | Requires a valid authenticated app request that displays exactly three suggestions. No claim made from quota loading HTTP 200 alone. |
| Gemini invalid-output regression | PASS (Deno unit), PENDING_MANUAL deploy | Validator now accepts structurally valid natural greetings and fenced JSON while retaining count/length/distinctness checks. 5/5 Deno PASS; remote deploy is blocked by unavailable CLI credential. |

## Ma trận AI acceptance

| ID | Status | Evidence / giới hạn |
|---|---|---|
| AI-UT01 | BLOCKED_MANUAL | SQL migration có đúng flow 2 Bio lifetime; parser/repository unit PASS, nhưng success quota DB thật chưa chạy pgTAP. |
| AI-UT02 | BLOCKED_MANUAL | Server lifetime bucket đã code; cần local/remote DB + hai phiên/thiết bị để chứng minh persistence reinstall. |
| AI-UT03 | PARTIAL | Unit validates malformed output and Function source calls refund. pgTAP refund case đã viết nhưng chưa chạy. |
| AI-UT04 | PARTIAL | Prompt cấm bịa dữ kiện, JSON/output length validated. Cần live/provider mock Deno run để xác minh full Function path. |
| AI-UT05 | BLOCKED_MANUAL | Exactly-three parser unit PASS; daily success count cần pgTAP/live. |
| AI-UT06 | BLOCKED_MANUAL | SQL enforces bucket limit; needs pgTAP run. |
| AI-UT07 | PARTIAL | Static check PASS for `Asia/Ho_Chi_Minh` and `reset_at` midnight +07; boundary clock test needs local DB. |
| AI-UT08 | BLOCKED_MANUAL | Transaction row lock/source reviewed; three true concurrent DB clients need Docker/local DB. |
| AI-UT09 | BLOCKED_MANUAL | Cache/idempotency RPC and SQL test written; needs local DB execution. |
| AI-UT10 | PARTIAL | RLS/grant static PASS; auth RPC test needs local DB. |
| AI-UT11 | PARTIAL | `private.can_use_active_match` checked in context, reserve, finalize; nonparticipant pgTAP written but not executed. |
| AI-UT12 | PARTIAL | Mock provider Deno test written; Deno unavailable. Error/refund source reviewed. |
| AI-UT13 | PASS (source) | Client cannot send target profile/user id; Function only accepts `match_id` and reads context via trusted RPC. Runtime DB test pending. |
| AI-UT14 | PASS (unit) | 15 Jest tests reject wrong count, duplicates, short output, malformed quota/input. Edge Deno test pending. |
| AI-UT15 | PARTIAL | Code path `onSelect → setText` has no `sendMessage`; Android manual verification pending. |
| AI-UT16 | PARTIAL | Function missing-key branch returns safe error before reserve; configuration/device smoke pending. |
| AI-UT17 | PASS (source) | Both UI paths use only `ProComingSoonModal`; no billing/plan mutation exists. |
| AI-UT18 | PASS | Client source secret scan exit 0; manual review/deploy-secret test remains required. |
