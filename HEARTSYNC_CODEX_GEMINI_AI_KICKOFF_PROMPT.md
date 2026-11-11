# PROMPT KHỞI CHẠY CODEX — TÍCH HỢP GEMINI AI CHO HEARTSYNC

> Sao chép **toàn bộ** nội dung phần **PROMPT** dưới đây vào Codex. Đặt file `HEARTSYNC_GEMINI_AI_FEATURE_SPEC_V1.md` tại thư mục gốc repository `HeartSync-Mobile/` trước khi chạy.

---

## PROMPT

Bạn là Senior React Native / Expo + Supabase Engineer, có trách nhiệm triển khai và kiểm thử hai tính năng Gemini AI **thật sự hoạt động** vào ứng dụng HeartSync hiện tại.

### 1. Tài liệu phải đọc đầu tiên

Đọc đầy đủ `HEARTSYNC_GEMINI_AI_FEATURE_SPEC_V1.md` tại root repository. Đây là yêu cầu cho task hiện tại. Sau đó kiểm tra toàn bộ repository đang mở, nhất là:

- `heartsync/` — React Native Expo SDK 58, screens, navigation, profile, chat, matching, theme, Supabase client và test conventions;
- `supabase/` — migrations, schema, RLS policies, RPC, Edge Functions và config hiện tại;
- `docs/` — tài liệu setup, quyền truy cập, log tiến độ, SRS/SDS reference (nếu có).

Tại thời điểm soạn, repo GitHub là `nhocbinhbo99/HeartSync-Mobile`, ứng dụng đã **đổi từ `mobile/` thành `heartsync/`**. Bạn phải **xác minh thực tế trước khi động vào source**, không assume tên cũ hoặc tạo thêm app mới.

SRS/SDS trước đây còn chưa đồng bộ với code. Dùng chúng để hiểu nghiệp vụ, nhưng ưu tiên architecture an toàn và implementation chính xác theo source, sau đó tạo `docs/ai/DOCUMENTATION_DELTA.md` để nhóm cập nhật tài liệu. **CODE → TEST → DOC UPDATE**, không làm ngược và không sửa đè DOCX gốc.

### 2. Yêu cầu sản phẩm không được thay đổi

**AI-01 — Profile Assistant:**
- Tùy chọn trong Edit Profile, người dùng nhấn mới gọi Gemini.
- Tối đa **2 lần sinh Bio thành công cho mỗi `auth.users.id` TRỌN ĐỜI** (không phải 2/ngày).
- Một lần thành công sinh một Bio; người dùng xem trước, chọn và chỉnh sửa. **Không tự ghi vào Profile** nếu chưa nhấn dùng và lưu.
- Từ lần thứ 3 chặn tại server và có nút **Nâng cấp Pro**. Nhấn vào chỉ hiện: `HeartSync Pro sắp ra mắt! Tính năng nâng cấp và thêm lượt AI sẽ được cập nhật trong phiên bản tới.` Không có billing hay mở quota.

**AI-02 — Icebreaker:**
- Tùy chọn tại Match Found hoặc Chat theo UI thật; chỉ active Match.
- Tối đa **2 lượt sinh thành công/người/ngày, reset 00:00 Asia/Ho_Chi_Minh**.
- **Mỗi lượt = một request Gemini và trả đúng 3 câu mở đầu**, không phải 3 request và không phải 2 câu/ngày.
- Chọn câu chỉ điền vào Chat composer, không tự động gửi.
- Hết lượt có nút **Nâng cấp Pro** với cùng thông báo Coming Soon, không thanh toán.

Hai tính năng không được làm hỏng Profile/Discovery/Matching/Chat/Audio/Video vốn có. Nếu không sử dụng AI, app vẫn hoạt động đầy đủ.

### 3. Bảo mật bắt buộc

**TUYỆT ĐỐI không đặt Gemini API key trong React Native**, không trong `EXPO_PUBLIC_*`, `.env` Expo, `app.json`, `eas.json`, source frontend, Git, console log hoặc ảnh. Chỉ đọc `GEMINI_API_KEY` trong Supabase Edge Function Secrets. Frontend chỉ gọi Supabase Edge Function với user session.

- Xác thực JWT và quyền user trên server. Không để client tự khai `user_id` hoặc partner profile hợp lệ.
- Icebreaker: nhận `match_id`, xác nhận người dùng thuộc Match còn hiệu lực, không bị block, truy vấn **chỉ sở thích công khai thật cần thiết**. Không gửi Chat, email, token, vị trí chính xác, số điện thoại, ảnh cho Gemini.
- Hiện thông báo đồng ý chủ động trước khi chuyển dữ liệu tùy chọn sang Gemini, vì Free Tier có chính sách sử dụng dữ liệu để cải thiện dịch vụ.
- DB quota phải an toàn với 3 requests concurrent, idempotency và provider failure. **Không dựa vào AsyncStorage/localStorage để chống lạm dụng**.
- Không tự deploy remote Supabase/migration, không tự cấu hình billing hoặc mua API, không push `main`. Nếu thiếu access, ghi manual blocker rồi làm phần offline.

### 4. Công việc bắt buộc phải làm thật

Thực hiện A00–A07 theo spec, **không dừng ở viết kế hoạch**:

1. Audit app, tìm file paths và contract hiện có, báo `IMPLEMENTATION_PLAN.md` ngắn.
2. Tạo types/validators/service dùng chung với app hiện tại.
3. Tạo migration quota server-side, RPC/transaction reserve–finalize, chống race và đảm bảo lỗi Gemini không trừ lượt.
4. Xây Edge Function Gemini `ai-assistant` với authentication, model cấu hình qua server env `GEMINI_MODEL` (ưu tiên `gemini-3.5-flash-lite` nếu project Free được cấp quyền), validation structured output, timeout và error rõ.
5. Tích hợp UI Profile Assistant (preview + 2 lượt lifetime + Pro Coming Soon).
6. Tích hợp UI Icebreaker (3 câu/lượt + 2 lượt/ngày VN + điền composer + Pro Coming Soon).
7. Viết tests thực tế và chạy typecheck/lint/test suite hiện có, tránh regression. Mock Gemini trong unit tests; integration SQL bằng local DB nếu khả dụng. Test quyền, concurrency, quota reset, reject, timeout, retry, error, AI opt-in, không auto-send. Không claim live API thành công nếu chưa có key.
8. Ghi `docs/ai/PROGRESS.md`, `RUN_LOG.md`, `TEST_REPORT.md`, `MANUAL_ACTIONS.md`, `DOCUMENTATION_DELTA.md`, `HANDOFF.md`. Mỗi phase cập nhật status `TODO`/`IN_PROGRESS`/`DONE`/`BLOCKED`, file thay đổi, lệnh chạy và kết quả.

### 5. Các điểm cần báo cáo cuối lượt làm việc

Khi kết thúc, cho tôi câu trả lời ngắn gọn bằng tiếng Việt:

- Đã sửa/tạo những file nào, hai UI AI nằm ở đâu;
- A00–A07 bước nào DONE / BLOCKED;
- Những lệnh kiểm tra đã chạy và PASS/FAIL thật;
- Chưa test được phần nào nếu không có remote Supabase, Gemini key hoặc Android thực;
- Những thao tác **tôi phải thực hiện thủ công theo thứ tự**, đặc biệt tạo Gemini API key Free và lưu tại **Supabase Dashboard → Edge Function Secrets** dưới tên `GEMINI_API_KEY`; chọn model Free và kiểm tra rate limit; duyệt migration; deploy Edge Function; test 2 tài khoản.

Không báo hoàn thành khi mới có mock screen hoặc placeholder. Không bịa key, thông số quota Google, kết quả deploy hay test Android.

**BẮT ĐẦU NGAY: đọc spec, audit source và thực hiện A00; nếu không có blocker thực sự, tiếp tục tuần tự và cập nhật log.**

---

## HƯỚNG DẪN ĐẶT FILE

```text
HeartSync-Mobile/                         # thư mục Git repository, mở bằng Codex
├── HEARTSYNC_GEMINI_AI_FEATURE_SPEC_V1.md
├── HEARTSYNC_CODEX_GEMINI_AI_KICKOFF_PROMPT.md
├── heartsync/                            # app Expo hiện tại
├── supabase/                             # migrations, functions
└── docs/
```

Nên chạy trên nhánh mới `feat/gemini-ai-assistant` và review trước khi merge; không trực tiếp push `main`.
