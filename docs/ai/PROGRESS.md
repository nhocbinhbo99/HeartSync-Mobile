# Tiến độ Gemini AI

| Bước | Trạng thái | Kết quả / blocker |
|---|---|---|
| A00 | DONE | Đã đọc hai đặc tả root, audit Profile/Chat/Match/Service/SQL/Function và chốt điểm tích hợp trong `IMPLEMENTATION_PLAN.md`. |
| A01 | DONE | `shared/domain/ai.ts`, `AiAssistantRepository`, safe Function error mapping và Jest validators/client tests. |
| A02 | DONE (remote repair verified) | Forward-only quota/RLS/active-Match context/reserve/finalize/refund/idempotency và repair `20261111160000_fix_ai_icebreaker_period_constraint.sql` đã áp dụng production. `reserve_ai_request` với user/Match test trả `reserved` trong transaction rollback. pgTAP execution vẫn BLOCKED_MANUAL vì Docker daemon không chạy. |
| A03 | DONE (remote deploy verified) | `ai-assistant` mới nhất đã deploy production; gateway trả `401` khi request thiếu JWT. Deno Gemini unit: 4/4 PASS qua `npx deno`. |
| A04 | DONE (implementation) | Bio sheet trong `ProfileEditor`: opt-in, consent, preview, 2 lifetime quota, only-fill-form, Pro Coming Soon. Android/manual test còn BLOCKED_MANUAL. |
| A05 | DONE (implementation) | Icebreaker sheet trong `ChatScreen`: active-Match-only, exactly 3 suggestions, only-fill-composer, VN quota, Pro Coming Soon. Android/manual test còn BLOCKED_MANUAL. |
| A06 | PARTIAL / BLOCKED_MANUAL | Typecheck, lint, 27 suites/109 Jest tests, AI Jest tests, Deno Gemini 4/4, static SQL/security và client secret scan PASS. DB pgTAP (Docker daemon không phản hồi), live Gemini/Android smoke chưa chạy. |
| A07 | DONE | Handoff, manual steps, test matrix, logs và documentation delta đã hoàn tất; không đánh dấu release-ready khi các blocker thật còn tồn tại. |

## Theo dõi integration remote — 11/11/2026

- Dashboard audit trên Match mới `Test03` / `Test02` xác nhận `status = active`, không bị block, và helper `private.can_use_active_match(...)` trả `true` khi mô phỏng đúng JWT của thành viên Match.
- Vì vậy lỗi Icebreaker trước đó **không phải** do Match, block hay RLS logic của helper. Khả năng còn lại là PostgREST chưa nạp cache RPC mới hoặc Function đang che mã lỗi RPC.
- Đã cập nhật source Function cục bộ để chỉ trả `MATCH_NOT_ALLOWED` với SQLSTATE `42501`; mọi lỗi RPC/provider/cấu hình khác trả `503` và ghi log tối thiểu gồm `request_id`, action, phase, loại lỗi và error code (không gồm JWT, user/match ID, profile, prompt, kết quả AI hoặc secret). Chưa deploy remote.
- Đã thêm `notify pgrst, 'reload schema';` vào migration cho môi trường áp dụng mới. Vì production đã được owner chạy migration thủ công trước đó, owner cần chạy câu lệnh notify một lần trong SQL Editor; nó không thay đổi dữ liệu.
- Log Function production lúc 15:36 cho `phase = reserve_quota`, `error_code = 23514`. Đối chiếu migration cho thấy constraint `ai_generation_request_shape` dùng `\\d` (hai backslash) thay vì digit regex, nên từ chối period key `YYYY-MM-DD`. Đã tạo migration repair forward-only; chờ owner áp dụng remote.
- Retest sau khi owner xác nhận `ai_generation_request_shape` đã dùng `[0-9]` vẫn có `reserve_quota / 23514`. Function remote chưa log trường `constraint`, nên chưa có bằng chứng xác định check constraint còn lại; cần deploy source diagnostic mới nhất rồi retest. Không ghi/lưu request metadata nhạy cảm trong docs.
- CLI remote audit xác nhận constraint còn lại ở `public.ai_quota_buckets` cũng dùng `\\d` sai. Repair đã thay cả quota-bucket và request-shape constraints bằng `[0-9]`, đã apply production. Live authenticated DB reservation đã PASS trong một transaction rollback; không tạo/quota-charge dữ liệu thật.
- Gemini trả HTTP 502 `gemini_generation / invalid_response` sau khi DB repair. Source đã nới Icebreaker validator theo spec và thêm parse JSON code-fence; Deno 5/5 PASS. Deploy bản validator này đang BLOCKED_MANUAL vì CLI session không còn access token và sandbox không cấp quyền đọc credential; remote hiện chưa có thay đổi validator cuối này.

## Ranh giới không thực hiện tự động

- Không push/merge Git, tạo API key, billing hay trạng thái Pro. Remote repair/function deploy chỉ được thực hiện sau khi owner cấp quyền rõ ràng ngày 11/11/2026.
- Không tạo API key, bật billing, thanh toán hoặc trạng thái Pro.
- Không đặt `GEMINI_API_KEY` ở client, `.env` Expo, config build hay log.
