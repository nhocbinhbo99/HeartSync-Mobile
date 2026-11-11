# Kế hoạch triển khai Gemini AI — HeartSync

## A00 — Audit đã hoàn tất

**Ngày audit:** 11/11/2026 (Asia/Ho_Chi_Minh)  
**Phạm vi:** AI Profile Assistant và AI Icebreaker theo `HEARTSYNC_GEMINI_AI_FEATURE_SPEC_V1.md`. Không có migration/deploy Supabase remote, push Git, thanh toán hoặc khoá Gemini trong client.

## Hiện trạng đã xác minh

| Khu vực | File thực tế | Quyết định tích hợp |
|---|---|---|
| Form hồ sơ | `heartsync/src/features/profile/ProfileEditor.tsx` | Đặt CTA và sheet AI ngay dưới `Giới thiệu về bạn`; CTA chỉ điền `draft.bio`, flow `save_my_profile` hiện hữu vẫn là nơi lưu DB. |
| Chat composer | `heartsync/src/features/chat/ChatScreen.tsx` | Đặt CTA Icebreaker trước trường `Tin nhắn`; chọn câu chỉ gọi `setText`, không gọi `sendMessage`. |
| Match Found | `heartsync/src/features/matching/MatchFoundScreen.tsx` | Không thêm flow thứ hai; điều hướng Chat sẵn có là điểm dùng Icebreaker duy nhất để giảm bề mặt UI. |
| Service boundary | `heartsync/src/services/contracts.ts`, `AppServicesProvider.tsx` | Thêm `AiAssistantRepository` và adapter Supabase; screen không import/call Supabase trực tiếp. |
| Edge Function pattern | `supabase/functions/livekit-token/index.ts` | Dùng JWT Authorization + RLS-scoped client, `verify_jwt=true`; không dùng `auth: none` hay service-role để xử lý request người dùng. |
| Match authorization | `private.can_use_active_match(uuid)` trong migration `20261029194100_rls_and_rpcs.sql` | Tái dùng helper để chỉ đọc interest tối thiểu của đúng Match active, chưa block/unmatch. |
| Quota persistence | `supabase/migrations/` | Thêm migration forward-only với bucket quota, request idempotency, reserve/finalize/refund RPC và RLS. |
| Test convention | `heartsync/src/**/__tests__`, `supabase/tests/*.sql` | Jest cho validators/client/function helpers; pgTAP cho RLS, quota, idempotency, refund và reset VN. |

## Thiết kế chốt

1. Mobile gọi duy nhất `supabase.functions.invoke('ai-assistant')` qua repository. `GEMINI_API_KEY` không xuất hiện trong Expo source/config/log.
2. Function phải có user JWT. Với `generate_icebreaker`, client chỉ gửi `match_id`; RPC tự suy ra hai profile và trả danh sách interest công khai tối thiểu.
3. DB tạo reservation trước khi gọi Gemini; `finalize` chỉ tăng `used_count` sau khi Function validate output. Provider/network/output lỗi gọi `fail` để giải phóng reservation. Cùng `request_id` đã hoàn thành trả cache, request đang chạy trả `REQUEST_IN_PROGRESS`.
4. Bio có bucket `profile_bio/lifetime`; Icebreaker có `icebreaker/YYYY-MM-DD` do PostgreSQL tính theo `Asia/Ho_Chi_Minh`. Cả hai giới hạn 2 successful generation; quota pending được tính vào `remaining` để chống race.
5. Function dùng REST `generateContent` với JSON structured output và timeout. Model đọc từ `GEMINI_MODEL`, default `gemini-3.5-flash-lite`; chỉ người quản trị xác nhận model này có trong Free Tier project trước khi deploy.
6. Không gửi Gemini JWT/email/điện thoại/GPS/ảnh/chat/real name. Prompt xem text profile và input là **dữ liệu**, không phải instruction; output được validate lại server-side.

## Rủi ro và blocker đã biết

- Workspace hiện không nhận `git status` dù `git rev-parse --show-toplevel` trả về root (`fatal: this operation must be run in a work tree`). Không thực hiện branch/push/reset; cần chủ repo kiểm tra Git metadata trước khi merge.
- Chưa có Gemini key, Supabase project link/local Docker và Android device được cung cấp. Unit/static checks có thể chạy offline; live Gemini, local/remote DB integration và device smoke sẽ được ghi `BLOCKED_MANUAL`, không tính PASS.
- `gemini-3.5-flash-lite` hỗ trợ structured output theo Google docs hiện hành, nhưng quyền Free Tier/rate limit là cấu hình project và phải xác nhận thủ công trước deploy.

## Các bất biến regression

- `ProfileEditor` vẫn dùng Save hiện hữu; AI không tự ghi Bio.
- `ChatScreen` chỉ gửi khi người dùng bấm `Gửi`; AI không tự insert message.
- Active Match và block/unmatch được server xác thực ngay trước reserve quota.
- Không tạo billing/Pro state: CTA chỉ mở dialog Coming Soon.

## Delivered source (A01–A05)

- `heartsync/src/shared/domain/ai.ts`: request/quota/output parser và validator dùng lại ở client tests.
- `heartsync/src/services/aiAssistantRepository.ts`: adapter duy nhất gọi `supabase.functions.invoke('ai-assistant')`; không có client key.
- `heartsync/src/features/ai/`: consent UX, Coming Soon dialog, Bio and Icebreaker sheets.
- `supabase/migrations/20261111110000_heartsync_ai_quota.sql`: persistent quota, RLS, context RPC, reservation/finalization/refund/idempotency.
- `supabase/functions/ai-assistant/`: authenticated Gemini REST proxy, structured JSON validation, timeout và safe error response.

Điểm cần xác nhận trước release vẫn là database migration/runtime Edge Function thực và Android smoke; xem `TEST_REPORT.md` và `MANUAL_ACTIONS.md`.
