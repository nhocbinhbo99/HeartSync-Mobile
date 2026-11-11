# Documentation delta — Gemini AI

Tài liệu SRS/SDS DOCX gốc không bị sửa. Đây là nội dung nhóm cần đồng bộ **sau khi** local/remote acceptance hoàn tất.

## SRS cần bổ sung

- AI Profile Assistant là tùy chọn trong Edit Profile: tối đa 2 Bio thành công cho mỗi `auth.users.id` trọn đời, preview/chỉnh sửa trước khi người dùng tự lưu Profile.
- AI Icebreaker là tùy chọn cho Match active: tối đa 2 lượt thành công/ngày lịch `Asia/Ho_Chi_Minh`; mỗi lượt trả đúng 3 câu. Chọn câu chỉ điền composer, không tự gửi.
- Cả hai yêu cầu consent rõ ràng trước lần truyền dữ liệu đầu tiên đến Gemini. Không truyền chat, email, phone, GPS, ảnh hoặc token.
- Pro chỉ là dialog “sắp ra mắt”, không có payment, plan update hay bypass quota.

## SDS cần bổ sung

- React Native → `AiAssistantRepository` → Supabase Function `ai-assistant` với user JWT.
- Function dùng RLS-scoped Supabase client, server-only `GEMINI_API_KEY`, `GEMINI_MODEL`, timeout 12 giây, REST structured JSON, output validation và safe error taxonomy.
- `ai_quota_buckets` giữ count/reservation theo user/feature/period; `ai_generation_requests` giữ idempotency/cache ngắn hạn, không giữ prompt/JWT/secret.
- RPC reserve → Gemini → finalize/fail, row lock chống race, reclaim reservation quá hạn; `private.can_use_active_match` được kiểm tra khi reserve và finalize Icebreaker.

## Testing report cần bổ sung khi release

- Kết quả command (version Docker/Deno/Supabase CLI), pgTAP, three-client concurrency, live Gemini sanitized request/response class và two-device Android evidence.
- Nêu rõ GMT+7 boundary test, account persistence test, RLS two-user test, blocked/unmatched timing test và no-auto-send test.
- Không biến kết quả unit/mock/static hiện có thành bằng chứng Gemini live hoặc remote deploy.
