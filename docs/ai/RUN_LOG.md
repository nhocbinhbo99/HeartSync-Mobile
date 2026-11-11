# Run log — Gemini AI

Múi giờ báo cáo: Asia/Ho_Chi_Minh. Chỉ những lệnh bên dưới đã thực sự chạy mới được ghi nhận.

## 11/11/2026 — A00 audit

| Lệnh / thao tác | Kết quả |
|---|---|
| Đọc đầy đủ `HEARTSYNC_GEMINI_AI_FEATURE_SPEC_V1.md` và `HEARTSYNC_CODEX_GEMINI_AI_KICKOFF_PROMPT.md` | PASS — yêu cầu sản phẩm, bảo mật và A00–A07 đã được nạp. |
| `Get-Content -Raw AGENTS.md` và `heartsync/AGENTS.md` | PASS — xác nhận React Navigation, service contracts và quality gates bắt buộc. |
| `rg --files heartsync supabase docs` và đọc ProfileEditor, ChatScreen, MatchFound, services, migrations, function pattern, tests | PASS — file paths đã ghi vào Implementation Plan. |
| `git status --short` | BLOCKED — Git trả `fatal: this operation must be run in a work tree`; không thực hiện lệnh Git thay đổi trạng thái. |
| Đối chiếu official Google/Supabase docs | PASS — model `gemini-3.5-flash-lite` và structured JSON hiện được document; Edge Function user auth/RLS giữ JWT verification mặc định. |

Chưa chạy test ở A00 vì chưa có source AI. Các lần chạy A01–A06 sẽ được ghi kèm exit code thực tế.

## 11/11/2026 — A01–A07 implementation and verification

| Lệnh / thao tác | Exit / kết quả thực tế |
|---|---|
| `npm.cmd run typecheck` (lần đầu) | FAIL — parser quota có `unknown` chưa narrowed; đã sửa, không phải lỗi baseline. |
| `npm.cmd run typecheck` (sau sửa) | PASS, exit 0. |
| `npx.cmd jest src/shared/domain/__tests__/ai.test.ts src/services/__tests__/aiAssistantRepository.test.ts --runInBand --verbose` | PASS, 2 suites / 15 tests. Covers request/output/quota parser, malformed output, safe Function errors, no invoke for invalid input. |
| `npx.cmd eslint` trên toàn bộ file AI và integration points | PASS, exit 0 sau khi xử lý React Hook lint. |
| `npm.cmd test -- --runInBand` | PASS, exit 0: 27 suites / 109 tests / 0 snapshots. |
| `npm.cmd run lint` | PASS, exit 0. |

## 11/11/2026 — Remote Icebreaker diagnosis follow-up

| Lệnh / thao tác | Exit / kết quả thực tế |
|---|---|
| Dashboard SQL: audit Match mới | PASS (do owner thực hiện) — Match `Test03`/`Test02` active, không block và hợp lệ theo helper. |
| Dashboard SQL: mô phỏng `request.jwt.claim.sub` bằng thành viên của Match rồi gọi `auth.uid()` + `private.can_use_active_match(...)` | PASS (do owner thực hiện) — `actor_id` trùng user dự kiến, `can_use_match = true`. Điều này loại trừ Match/helper là nguồn 403 trước đó. |
| Cập nhật source `ai-assistant/index.ts` để phân loại lỗi RPC và log tối thiểu | DONE cục bộ — chưa deploy remote; không thêm dữ liệu nhạy cảm vào log. |
| Bổ sung `notify pgrst, 'reload schema'` cuối migration | DONE cục bộ — môi trường đã migration cần owner chạy notify thủ công một lần. |
| `powershell.exe -ExecutionPolicy Bypass -File supabase\\tests\\static_migration_checks.ps1` | PASS, exit 0 — 14 RLS tables, 10 public RPCs và bất biến quota. Đây không phải PostgreSQL execution test. |
| `npm.cmd run typecheck` sau safe RPC diagnostics | PASS, exit 0. |
| `npm.cmd run lint` sau safe RPC diagnostics | PASS, exit 0. |

## 11/11/2026 — Provider/configuration diagnostic follow-up

| Lệnh / thao tác | Exit / kết quả thực tế |
|---|---|
| Bổ sung mapping Gemini HTTP `400/401/403/404` → `GEMINI_CONFIGURATION_ERROR` | DONE cục bộ — không đọc/log response body Gemini. |
| Bổ sung safe audit cho provider/configuration, output và phản hồi RPC không hợp lệ | DONE cục bộ — event `ai_assistant_failure` chỉ có action, request ID, phase, result class và code. Chưa deploy remote. |
| Thêm Deno unit test cho mapping HTTP 403 | DONE trong source — BLOCKED_MANUAL thực thi vì Deno chưa có trong PATH. |

## 11/11/2026 — Icebreaker quota constraint production repair

| Lệnh / thao tác | Exit / kết quả thực tế |
|---|---|
| Edge Function production log (owner cung cấp) | ROOT CAUSE FOUND — `ai_assistant_failure`: `phase=reserve_quota`, `error_code=23514`. Gemini chưa được gọi. |
| Audit source của constraint `ai_generation_request_shape` | ROOT CAUSE CONFIRMED — initial migration lưu regex `\\d` (hai backslash), khiến PostgreSQL đòi literal `\\d` thay vì chữ số trong period key Icebreaker. |
| Tạo `20261111160000_fix_ai_icebreaker_period_constraint.sql` | DONE cục bộ — drop/re-add đúng constraint với `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`, sau đó reload PostgREST schema. Chưa apply remote. |
| Cập nhật static migration checks cho forward repair | PASS, exit 0 — vẫn là source-only check, không thay PostgreSQL/pgTAP execution. |
| Bổ sung safe constraint-name diagnostic trong Function | DONE cục bộ — chỉ allow-list identifier bắt đầu `ai_`; tuyệt đối không log raw Postgres message, row details, JWT, user/match ID, prompt hay secret. Chưa deploy remote. |
| Retest production sau repair (owner cung cấp log) | FAIL / PENDING_DIAGNOSIS — vẫn `generate_icebreaker`, `phase=reserve_quota`, `error_code=23514`, HTTP 503. Log remote không có `constraint`, nên chưa phải bản Function diagnostic mới nhất hoặc server error chưa match allow-list; không lưu metadata request thô vào file này. |
| Safe unhandled-request fallback trong Function | DONE cục bộ — mọi exception chưa bắt sẽ trả 503 nhất quán và ghi `UNHANDLED_REQUEST_ERROR`, không gồm stack/message/header/body. Chưa deploy remote. |
| `typescript.transpileModule` trên `ai-assistant/index.ts` | PASS — kiểm tra cú pháp TypeScript của Edge Function sau thay đổi. Không thay thế Deno unit/runtime test. |

## 11/11/2026 — Authorized remote remediation

| Lệnh / thao tác | Exit / kết quả thực tế |
|---|---|
| `npx.cmd supabase migration list --remote` | PASS — linked production project đúng, nhưng lịch sử migration remote trống; vì vậy không dùng `db push`. |
| `npx.cmd supabase db query --remote --read-only ...pg_constraint...` | ROOT CAUSE CONFIRMED — ngoài request-shape, `public.ai_quota_buckets_period_key_check` cũng dùng regex `\\d` sai; reserve insert quota bucket trước nên trả `23514`. |
| `npx.cmd supabase db query --remote --file supabase/migrations/20261111160000_fix_ai_icebreaker_period_constraint.sql --yes` | PASS — áp dụng repair idempotent lên production: thay cả hai constraints và reload PostgREST schema. |
| Remote constraint verification read-only | PASS — cả `ai_quota_buckets_period_key_check` và `ai_generation_request_shape` đều dùng `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`. |
| Remote authenticated reserve integration probe trong `BEGIN … ROLLBACK` | PASS — `reserve_ai_request` trả `state=reserved`, quota còn 1; `ROLLBACK` xác nhận không tạo request/quota charge thật. |
| `npx.cmd supabase functions deploy ai-assistant --yes` | PASS — deploy source Function mới nhất lên production. |
| POST Function không kèm JWT | PASS — gateway trả `401 UNAUTHORIZED_NO_AUTH_HEADER`; JWT verification vẫn bật. |
| `npx.cmd --yes deno test supabase/functions/ai-assistant/gemini.test.ts` | PASS — 4/4 Deno tests: structured output validation, 429 mapping, configuration-status mapping và structured JSON parsing. |
| Thử khởi động Docker Desktop + kiểm tra daemon | BLOCKED_MANUAL — Docker CLI vẫn không kết nối được `dockerDesktopLinuxEngine`; không chạy pgTAP/local stack. |

Sau deploy, `index.ts` được cập nhật thêm `return await serveGeneration(...)` trong safe fallback để Promise rejection bị bắt/log thay vì thành platform 503 không có event; TypeScript syntax transpile PASS và Function đã deploy lại production.

## 11/11/2026 — Gemini invalid-output correction

| Lệnh / thao tác | Exit / kết quả thực tế |
|---|---|
| Production Function log (owner screenshot) | ROOT CAUSE — HTTP 502, `phase=gemini_generation`, `result_class=invalid_response`. Quota/Match/RPC đã qua; Gemini output bị validator chặn. |
| Update `gemini.ts` | DONE cục bộ — hỗ trợ JSON code-fence/prefix bọc JSON và nới Icebreaker greeting validator: vẫn đúng 3 câu, 20–160 ký tự, khác nhau và có chữ; không log provider output. |
| `npx.cmd --yes deno test supabase/functions/ai-assistant/gemini.test.ts` | PASS — 5/5 tests, gồm valid greeting không có `?` và JSON code-fence. |
| Deploy updated validator | BLOCKED_MANUAL — Supabase CLI thiếu access token; sandbox không cấp quyền đọc credential lưu sẵn. Không tự đăng nhập/bypass credential. |

Chưa có kết quả live Gemini thành công qua app (cần một request Android xác thực trả ba gợi ý), nên không đánh dấu live end-to-end là PASS.
| Deploy/retest Function sau diagnostics (owner screenshot) | PARTIAL PASS — Function boot thành công và có `POST 200` lúc 16:17. Chưa đủ để xác nhận generation: request mở modal (`get_quota`) cũng trả 200; cần UI hiển thị đúng ba gợi ý hoặc log generation success. |

Chưa chạy Deno test vì Deno chưa có trong PATH; chưa deploy Function, apply migration remote hay thay đổi Supabase remote bằng Codex.
| `powershell.exe -ExecutionPolicy Bypass -File supabase\\tests\\static_migration_checks.ps1` | PASS, exit 0: static RLS/RPC + AI reservation/finalize/refund/timezone invariants. Không phải PostgreSQL execution test. |
| Client secret scan under `heartsync/` for `GEMINI_API_KEY` / `AIza…` | PASS, exit 0: không có Gemini key reference hay chuỗi trông như key. |
| `deno --version; deno test supabase/functions/ai-assistant/gemini.test.ts` | BLOCKED_MANUAL — `deno` không được cài/không có PATH. Test file có sẵn nhưng không tính PASS. |
| `npx.cmd supabase --workdir .. status` | BLOCKED_MANUAL — CLI local có, nhưng Docker Desktop daemon `dockerDesktopLinuxEngine` không chạy. Không thực hiện `db reset`, pgTAP hay bất kỳ remote command nào. |

Không có lệnh `supabase link`, `db push`, `migration up`, `functions deploy`, `git push`, billing, hoặc API key creation nào được chạy.

## Final re-check after safe-retry and per-user consent adjustment

| Lệnh | Kết quả |
|---|---|
| `npm.cmd run typecheck` | PASS, exit 0. |
| `npx.cmd eslint src/features/ai` | PASS, exit 0. |
| `npm.cmd test -- --runInBand` | PASS, exit 0: 27 suites / 109 tests. |
| `npm.cmd run lint` | PASS, exit 0. |
