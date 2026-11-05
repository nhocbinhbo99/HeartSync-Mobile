# Hướng dẫn cấu hình Cloud cho HeartSync Video Call

Tài liệu này dành cho Công, người đang giữ quyền quản trị Supabase, LiveKit và EAS. Mục tiêu là đưa phần VideoCall trên nhánh `feature/video-call` từ trạng thái **đã có code** sang trạng thái **gọi được thật giữa hai máy Android**.

Không ghi mật khẩu database, Supabase token, LiveKit API secret hoặc `CALL_CLEANUP_SECRET` vào Git, chat, ảnh chụp màn hình hay biến `EXPO_PUBLIC_*`.

## 1. “Cấu hình cloud” nghĩa là gì?

Ứng dụng trên điện thoại không tự ký token LiveKit. Luồng đúng là:

```text
Android A/B
  -> Supabase Auth + RPC cuộc gọi
  -> Supabase Edge Function livekit-token
  -> LiveKit Cloud room
  -> audio/video hai chiều
```

Do đó cần ba nhóm tài nguyên bên ngoài source code:

1. **Supabase Database:** migration cho lifecycle audio/video, RLS và cleanup queue.
2. **Supabase Edge Functions:** cấp token LiveKit và dọn media khi client thoát bất thường.
3. **LiveKit Cloud:** máy chủ truyền audio/video cùng bộ URL/API key/API secret.

## 2. Trạng thái đã kiểm tra ngày 05/11/2026

| Thành phần | Trạng thái |
| --- | --- |
| Nhánh code | `feature/video-call` |
| Supabase project | `heartsync-dev` — ref `namdkpfvieminzcoiskw` |
| Edge Functions trên cloud | Chưa có function nào được deploy |
| Custom Function Secrets | Chưa có secret nào |
| Auth signing key | ES256 bất đối xứng |
| Migration cloud | Chưa đối soát được migration history trong bước kiểm tra chỉ đọc |
| Android code | Đã có LiveKit SDK, camera/microphone permissions và màn VideoCall |

Kết luận: **code chưa đủ để gọi thật**. Cần làm lần lượt các bước bên dưới.

## 3. Những giá trị bạn cần tạo

Tạo một LiveKit Cloud project riêng cho môi trường development, ví dụ `heartsync-dev`. Không dùng chung project production.

Trong LiveKit Cloud:

1. Đăng nhập tại <https://cloud.livekit.io/>.
2. Tạo project development.
3. Mở **Project Settings** và sao chép Project URL có dạng:

   ```text
   wss://<project-subdomain>.livekit.cloud
   ```

4. Mở trang **API keys**, tạo một key dành cho HeartSync development.
5. Ghi lại an toàn ba giá trị:

   - `LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`

API secret có thể chỉ hiển thị đầy đủ một lần. Nếu mất, hãy tạo key mới; không lưu nó trong repository.

Tạo thêm một secret ngẫu nhiên cho cleanup worker. Trong PowerShell:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes) | Set-Clipboard
```

Giá trị trong clipboard là `CALL_CLEANUP_SECRET`. Không dán nó vào chat.

## 4. Thêm bốn secrets vào Supabase

Mở đúng project `heartsync-dev`:

```text
Supabase Dashboard
  -> Edge Functions
  -> Secrets
```

Thêm đúng bốn tên sau:

| Tên secret | Giá trị |
| --- | --- |
| `LIVEKIT_URL` | Project URL bắt đầu bằng `wss://` |
| `LIVEKIT_API_KEY` | API key của LiveKit project development |
| `LIVEKIT_API_SECRET` | API secret tương ứng |
| `CALL_CLEANUP_SECRET` | Chuỗi ngẫu nhiên 32 byte vừa tạo |

Không tự tạo `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEYS` hoặc `SUPABASE_SERVICE_ROLE_KEY`. Supabase Edge Runtime tự cung cấp những biến này và cấm custom secret bắt đầu bằng `SUPABASE_`.

Sau khi lưu, Dashboard chỉ cần hiển thị **tên** bốn secret. Không chụp hoặc chia sẻ giá trị.

## 5. Dùng đúng Supabase CLI đã pin

Supabase CLI v3 đã thay đổi hành vi target local/hosted. Repository đang pin CLI `2.122.0`, vì vậy chạy từ thư mục `heartsync` và không dùng `npx supabase@latest`:

```powershell
cd D:\documents\23731851_HoangPhuocThanhCong\Nam4_Ky1\Mobile\HeartSync\SRC\HeartSync-Mobile\heartsync
npx supabase --version
```

Kỳ vọng:

```text
2.122.0
```

Đăng nhập và link đúng project:

```powershell
npx supabase login
npx supabase --workdir .. link --project-ref namdkpfvieminzcoiskw
```

Chỉ nhập database password tại prompt. Không thêm password vào command.

## 6. Đối soát migration trước khi thay đổi cloud

Đây là bước an toàn bắt buộc vì một số migration trước đây có thể đã được chạy thủ công bằng SQL/`psql` nhưng chưa có migration history tương ứng.

Chỉ kiểm tra, chưa apply:

```powershell
npx supabase --workdir .. migration list --linked
npx supabase --workdir .. db push --linked --dry-run
```

Backend gọi hoàn chỉnh phụ thuộc tối thiểu vào:

```text
20261104120000_messaging_calling.sql
20261105120000_video_call.sql
```

Migration `20261104120000_messaging_calling.sql` cung cấp call states, cleanup queue/RPC và Realtime lifecycle. Migration `20261105120000_video_call.sql` cho `start_call` chấp nhận loại `video`.

### Khi nào phải dừng?

Dừng và không chạy `db push` nếu dry-run:

- liệt kê các migration cũ mà bạn biết đã chạy thủ công;
- báo remote history không khớp;
- định apply nhiều file ngoài dự kiến;
- trỏ nhầm project/ref;
- yêu cầu reset database.

Gửi **output đã che thông tin nhạy cảm** cho nhóm để đối soát. Không dùng `db reset` trên cloud.

Chỉ sau khi migration list đã được review, backup đã kiểm tra và có xác nhận thay đổi remote database, mới chạy:

```powershell
npx supabase --workdir .. db push --linked
```

## 7. Cấu hình xác thực Edge Function

Project `heartsync-dev` dùng Auth signing key ES256. `supabase/config.toml` vì vậy đặt:

```toml
[functions.livekit-token]
verify_jwt = false

[functions.call-media-cleanup]
verify_jwt = false
```

Điều này **không làm `livekit-token` trở thành endpoint phát token công khai**:

- `livekit-token` bắt buộc header `Authorization: Bearer <user JWT>`;
- function gọi `auth.getUser(token)` để xác thực JWT;
- function chỉ cấp token khi call đã `accepted`, Match còn `active`, loại call trùng và user là caller/callee;
- identity và room name được lấy từ server, không nhận từ client;
- `call-media-cleanup` bắt buộc đúng `CALL_CLEANUP_SECRET`.

Không thêm cờ `--no-verify-jwt` thủ công vào lệnh deploy; repository đã lưu cấu hình nhất quán trong `supabase/config.toml`.

## 8. Deploy hai Edge Functions

Docker không bắt buộc. Dùng API bundling của Supabase:

```powershell
npx supabase --workdir .. functions deploy livekit-token call-media-cleanup `
  --project-ref namdkpfvieminzcoiskw `
  --use-api
```

Kiểm tra sau deploy:

```powershell
npx supabase --workdir .. functions list --project-ref namdkpfvieminzcoiskw
npx supabase --workdir .. secrets list --project-ref namdkpfvieminzcoiskw
```

Kỳ vọng function list có:

```text
livekit-token
call-media-cleanup
```

Secrets list phải có bốn tên ở bước 4. Không cần redeploy function khi chỉ cập nhật secret; runtime nhận secret mới ngay.

## 9. Kiểm tra Realtime publication

Chạy query chỉ đọc trong Supabase SQL Editor:

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in ('messages', 'calls', 'matches')
order by tablename;
```

Kỳ vọng có đủ ba dòng `calls`, `matches`, `messages`. Nếu thiếu, không tự thêm tay trước khi đối soát migration `20261104120000_messaging_calling.sql`.

## 10. Tạo cleanup Cron sau khi basic call hoạt động

Cleanup worker xử lý trường hợp app bị kill, mất mạng hoặc không kịp disconnect khỏi LiveKit. Tạo job chạy mỗi phút sau khi hai function đã hoạt động.

1. Bật **Cron** và **pg_net** trong Supabase Dashboard nếu chưa bật.
2. Lưu project URL và cùng giá trị `CALL_CLEANUP_SECRET` vào Supabase Vault.
3. Tạo job `heartsync-call-media-cleanup` chạy `* * * * *`.
4. Job gửi `POST` đến:

   ```text
   https://namdkpfvieminzcoiskw.supabase.co/functions/v1/call-media-cleanup
   ```

5. Header bắt buộc:

   ```text
   Content-Type: application/json
   Authorization: Bearer <CALL_CLEANUP_SECRET>
   ```

6. Body:

   ```json
   {}
   ```

Không ghi secret thẳng vào migration hoặc source. Theo dõi job history và Function Logs; `200` là bình thường, `401` là secret giữa Vault và Function Secrets không trùng, `503` là thiếu backend config hoặc queue/LiveKit lỗi.

## 11. Có cần build APK mới không?

Các thay đổi cloud, migration và Edge Function không yêu cầu build lại APK.

APK hiện tại dùng được nếu nó đã được build sau khi project có:

- `@livekit/react-native`;
- `@livekit/react-native-webrtc`;
- LiveKit/WebRTC Expo config plugins;
- Android permissions `CAMERA` và `RECORD_AUDIO`.

Nhánh hiện tại đã có các phần trên. Chỉ build lại nếu APK đang cài là bản cũ từng báo thiếu native module hoặc chưa chứa camera permission.

Chạy Metro hằng ngày:

```powershell
npx expo start --dev-client --tunnel --clear
```

## 12. Kiểm thử theo thứ tự

Chuẩn bị hai tài khoản A/B đang có Match active và tài khoản C không thuộc Match đó.

1. A bấm gọi video cho B.
2. B thấy incoming call và Accept.
3. A/B cùng nhận token, vào cùng room và thấy/nghe nhau.
4. Kiểm tra mute, tắt/bật camera, đổi camera, end call.
5. Kiểm tra decline, cancel và timeout 45 giây.
6. C thử gọi hoặc xin token của call A/B phải bị từ chối.
7. Unmatch/block phải ngăn call/token mới.
8. Tắt mạng hoặc kill app, sau đó kiểm tra Cron/cleanup logs.
9. Thoát call phải tắt camera và microphone trên cả hai máy.

Không đánh dấu UC17 hoàn thành chỉ vì UI mở được; cần bằng chứng media hai chiều trên hai Android Development Builds.

## 13. Chẩn đoán nhanh

| Lỗi | Nguyên nhân thường gặp |
| --- | --- |
| `22023` / `invalid_call_type` | Migration video chưa được apply đúng project |
| Function `404` | Edge Function chưa deploy |
| `401 UNAUTHORIZED` | Session/JWT hết hạn, request thiếu Bearer token hoặc cleanup secret sai |
| `403 ACTIVE_MATCH_REQUIRED` | Call chưa accepted, Match không active, sai call type hoặc user không phải participant |
| `503 NOT_CONFIGURED` | Thiếu một trong các LiveKit secrets hoặc runtime Supabase key |
| Người nhận không thấy cuộc gọi | Thiếu Realtime publication/subscription hoặc RLS không cho đọc call |
| Có audio nhưng không có hình | Camera permission, camera track hoặc APK cũ |
| Cleanup luôn `503` | RPC cleanup chưa có, LiveKit credentials sai hoặc LiveKit API không truy cập được |

## 14. Checklist hoàn tất

- [ ] LiveKit development project đã được tạo.
- [ ] Đã có URL, API key và API secret của LiveKit.
- [ ] Supabase có đủ bốn custom secrets.
- [ ] Migration history đã đối soát, không reset cloud.
- [ ] Migrations messaging/calling và video đã apply đúng thứ tự.
- [ ] `livekit-token` và `call-media-cleanup` đã deploy.
- [ ] Realtime có `calls`, `matches`, `messages`.
- [ ] Cleanup Cron chạy thành công.
- [ ] A/B gọi video hai chiều thành công trên hai máy Android.
- [ ] C/non-member bị từ chối.
- [ ] Unmatch/block và thoát app giải phóng media đúng.

## Tài liệu chính thức

- [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase Authorization headers](https://supabase.com/docs/guides/functions/auth-headers)
- [Supabase Function configuration](https://supabase.com/docs/guides/functions/function-configuration)
- [Supabase deploy Edge Functions](https://supabase.com/docs/guides/functions/deploy)
- [Supabase Cron quickstart](https://supabase.com/docs/guides/cron/quickstart)
- [LiveKit project management](https://docs.livekit.io/reference/developer-tools/livekit-cli/projects/)
- [LiveKit tokens and grants](https://docs.livekit.io/frontends/reference/tokens-grants/)
