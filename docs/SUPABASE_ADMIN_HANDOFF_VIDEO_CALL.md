# Bàn giao Supabase cho Admin — HeartSync Video Call

**Mục đích:** tài liệu này liệt kê các cấu hình và triển khai còn thiếu trên Supabase Cloud để tính năng gọi video của HeartSync hoạt động an toàn. Đây là checklist cho admin/project owner, **không chứa mật khẩu, access token hay LiveKit secret**.

**Phạm vi:** môi trường development mà ứng dụng mobile đang trỏ tới. Không áp dụng nhầm sang production hoặc project Supabase khác.

## Tình trạng đã xác nhận

Ứng dụng đã có nút gọi video và đang gọi RPC `start_call(match_id, 'video')`. Khi bấm nút, ứng dụng nhận lỗi PostgreSQL `22023`, sau đó hiển thị câu chung *"Dữ liệu gửi lên không hợp lệ."*

Nguyên nhân xác nhận được là RPC đang chạy trên Cloud vẫn chỉ chấp nhận `audio` và trả `audio_only_in_mvp`. Migration mở hỗ trợ `video` đã có trong source nhưng **chưa được áp dụng lên Cloud**:

- `supabase/migrations/20261105120000_video_call.sql`

Vì RPC thất bại ngay từ đầu nên đây **chưa phải** lỗi camera, Android permission hay LiveKit.

## Quyền admin cần có

- Quyền vào đúng Supabase project (Developer/Admin/Owner, có quyền database migration và Edge Functions).
- Database password của project để Supabase CLI kết nối khi chạy `db push`.
- Quyền xem/đặt Edge Function Secrets.
- Quyền tạo hoặc xác nhận scheduler/Cron cho tác vụ dọn media.
- Thông tin LiveKit Cloud hoặc LiveKit self-hosted hợp lệ: URL, API key và API secret.

Không gửi những thông tin trên qua chat, Git hoặc file `.env` đã commit.

## Thành phần cần triển khai

| Ưu tiên | Thành phần | Hành động admin | Lý do |
| --- | --- | --- | --- |
| P0 | Database migration video | Áp dụng `20261105120000_video_call.sql` | Cho RPC `start_call` nhận `audio` hoặc `video`, vẫn giữ kiểm tra Match active, người bận và timeout 45 giây. Đây là lỗi đang chặn UI. |
| P0 | `livekit-token` Edge Function | Deploy source mới sau migration | Token video chỉ được cấp cho hai người thuộc Match active, call đã accepted và đúng loại call. |
| P0 | Function Secrets | Kiểm tra/đặt các secrets LiveKit ở Supabase | Function không thể phát token nếu thiếu cấu hình. |
| P1 | `call-media-cleanup` Edge Function + Cron | Deploy function, đặt secret, tạo lịch chạy | Dọn participant/room media khi client offline hoặc cuộc gọi kết thúc bất thường. |
| P1 | Realtime | Kiểm tra publication có `messages` và `calls` | Người nhận cần thấy cuộc gọi đến và trạng thái call cập nhật. |
| P1 | Migration history | Đối soát tất cả migration trước khi push | Không chạy mù các migration còn thiếu hoặc sửa migration đã áp dụng. |
| P2 | Auth callback URLs | Kiểm tra `heartsync://auth/callback` và `heartsync://auth/recovery` | Là điều kiện nền cho luồng đăng nhập ứng dụng, không phải nguyên nhân trực tiếp của lỗi video. |

## Bước triển khai khuyến nghị

> Chỉ làm sau khi nhánh chứa source video call đã được review/merge hoặc admin đã checkout đúng commit. Các file cần có là migration và hai Edge Functions nêu trong mục dưới.

### 1. Đăng nhập và link đúng project

Từ thư mục gốc repository:

```powershell
npx supabase@latest login
npx supabase@latest link --project-ref <SUPABASE_PROJECT_REF>
npx supabase@latest migration list --remote
```

- Dùng tài khoản Supabase có quyền vào project; đây **không phải** tài khoản Expo/EAS.
- Chỉ nhập database password tại prompt của terminal. Không thêm password vào command, source hay ticket.
- Lưu output `migration list` vào ticket để nhóm đối soát.

### 2. Xem trước rồi mới áp dụng migration

```powershell
npx supabase@latest db push --remote --dry-run
```

Kỳ vọng tối thiểu phải thấy:

```text
20261105120000_video_call.sql
```

Nếu dry-run còn liệt kê các migration sau, **dừng lại và đối soát migration history với nhóm trước khi push**; chúng có thể chưa được triển khai hoặc Cloud đã được chỉnh tay:

- `20261103120000_profile_preferences_contracts.sql`
- `20261104120000_messaging_calling.sql`
- `20261105080739_fix_reorder_profile_photos_constraint.sql`
- `20261105120000_video_call.sql`

Sau khi danh sách đã được review, áp dụng:

```powershell
npx supabase@latest db push --remote
```

Không dùng `db reset`, không sửa/xóa migration cũ đã có trong migration history, và không copy SQL vào production mà không review.

### 3. Deploy Edge Functions

Source cần deploy:

- `supabase/functions/livekit-token/index.ts`
- `supabase/functions/call-media-cleanup/index.ts`
- Cấu hình JWT: `supabase/config.toml`

```powershell
npx supabase@latest functions deploy livekit-token
npx supabase@latest functions deploy call-media-cleanup
```

Yêu cầu bảo mật bắt buộc:

- Giữ `livekit-token` với `verify_jwt = true`; **không** dùng `--no-verify-jwt`.
- `call-media-cleanup` có xác thực riêng qua shared secret vì được scheduler gọi server-to-server.
- Không ký LiveKit token trên mobile và không đưa LiveKit API secret/service-role key vào `EXPO_PUBLIC_*` hoặc app mobile.

### 4. Cấu hình Edge Function Secrets

Trong Supabase Dashboard → Edge Functions → Secrets, kiểm tra có các key sau (chỉ set giá trị tại Dashboard/CLI an toàn):

| Secret | Dùng cho |
| --- | --- |
| `LIVEKIT_URL` | URL WebSocket/endpoint LiveKit |
| `LIVEKIT_API_KEY` | Xác thực server LiveKit |
| `LIVEKIT_API_SECRET` | Ký token LiveKit tại Edge Function |
| `CALL_CLEANUP_SECRET` | Xác thực request từ scheduler đến `call-media-cleanup` |

`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`/`SUPABASE_ANON_KEY` và `SUPABASE_SERVICE_ROLE_KEY` được Supabase Edge Runtime cấp cho function; không tự tạo secret có prefix `SUPABASE_` và không đưa chúng vào ứng dụng mobile. Nếu bất kỳ secret nào từng bị lộ ngoài Vault/Dashboard, hãy rotate secret đó rồi deploy lại function.

### 5. Scheduler dọn media

Tạo một Cron/scheduler bảo mật gọi `POST /functions/v1/call-media-cleanup` mỗi phút với header:

```text
Authorization: Bearer <CALL_CLEANUP_SECRET>
```

Lưu `CALL_CLEANUP_SECRET` trong Supabase Vault hoặc secret store của scheduler. Không commit header/secret vào SQL, source hoặc pipeline log. Theo dõi response: HTTP `200` khi xử lý bình thường; HTTP `503` nghĩa là function thiếu cấu hình backend.

## Kiểm tra sau triển khai

### Database / RPC

Chạy trong SQL Editor để chỉ đọc định nghĩa RPC:

```sql
select pg_get_functiondef(
  'public.start_call(uuid, public.call_type)'::regprocedure
);
```

Định nghĩa phải chấp nhận cả `audio` và `video`; không còn điều kiện `audio_only_in_mvp`.

### Function / quyền truy cập

Với ba tài khoản thử nghiệm A/B/C và Match active A–B:

1. A tạo video call cho B: B thấy incoming call.
2. B chấp nhận: cả hai nhận token và vào LiveKit room.
3. C (không thuộc Match) không thể tạo call hoặc lấy token của A–B.
4. Khi Match bị unmatch/block, không tạo hoặc join call mới được.
5. Audio token chỉ publish microphone; video token chỉ publish microphone + camera, không cấp screen share.
6. Kết thúc/timeout/mất mạng: scheduler dọn participant và media; kiểm tra Function Logs.

### Android hai máy thật

Chỉ nghiệm thu UC17 sau khi test trên hai Android Development Builds:

- accept/decline/cancel/timeout;
- video và audio hai chiều;
- local preview, tắt/bật camera, đổi camera, mute micro;
- từ chối quyền camera/micro, mất mạng, background/foreground, unmatch/block;
- thoát call không để camera hoặc microphone tiếp tục hoạt động.

## Chẩn đoán nhanh

| Triệu chứng | Khả năng cao | Việc cần kiểm tra |
| --- | --- | --- |
| Bấm “Gọi video” thấy “Dữ liệu gửi lên không hợp lệ” | Migration video chưa ở đúng Cloud project | Migration history và `20261105120000_video_call.sql` |
| Vào call rồi báo token/invalid request | `livekit-token` chưa deploy hoặc source cũ | Thời điểm deploy và Function Logs |
| Function trả 401 | JWT người dùng không hợp lệ/hết hạn hoặc request không có session | Client session; vẫn giữ `verify_jwt = true` |
| Function trả 503 | Thiếu LiveKit/Supabase secret | Edge Function Secrets |
| Người nhận không thấy incoming call | Publication/Realtime hoặc subscription | Publication `calls`, Realtime logs và RLS |
| Audio chạy nhưng video không có hình | Permission camera, token source grant, camera track/LiveKit config | Android permission rồi Function Logs; không tự hạ xuống audio |

## Bàn giao lại cho nhóm phát triển

Admin vui lòng trả về ticket/nhóm các bằng chứng không nhạy cảm sau:

1. Tên môi trường và thời gian deploy (không gửi URL chứa secret).
2. Output đã review của `migration list` và `db push --dry-run`.
3. Xác nhận migration đã áp dụng và hai function đã deploy.
4. Xác nhận các key secret đã tồn tại (chỉ tên key, không giá trị).
5. Kết quả test A/B/C và Android hai máy, hoặc log lỗi đã redact.

## Tài liệu liên quan trong repository

- `docs/MODULE3_RUNBOOK.md` — runbook Calling, cleanup và nghiệm thu hai thiết bị.
- `docs/MVP_IMPLEMENTATION_STATUS.md` — trạng thái code so với Cloud/runtime verification.
- `supabase/migrations/20261105120000_video_call.sql` — migration bắt buộc cho lỗi hiện tại.
- `supabase/functions/livekit-token/index.ts` — cấp token LiveKit theo Match/call type.
- `supabase/functions/call-media-cleanup/index.ts` — dọn media server-side.

Tham khảo hành vi CLI hiện tại: [Supabase CLI v3 migration guide](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3) và [CLI reference](https://supabase.com/docs/reference/cli/introduction).
