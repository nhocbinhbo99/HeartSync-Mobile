# Bàn giao toàn bộ công việc Supabase cho Minh

> **Người thực hiện:** Minh
>
> **Môi trường duy nhất được thao tác:** `heartsync-dev`
>
> **Project ref:** `namdkpfvieminzcoiskw`
>
> **Nhánh mã nguồn:** `feature/video-call`
>
> **Ngày cập nhật:** 06/11/2026

Tài liệu này giao cho Minh thực hiện các công việc Supabase Cloud trước đây do Công phụ trách, đồng thời hoàn tất backend cho Chat, AudioCall và VideoCall. Đây là runbook thực thi, không phải báo cáo tiến độ và không chứa mật khẩu, access token hay giá trị secret.

## 1. Phạm vi Minh có thể thay Công thực hiện

Với quyền quản trị hiện có, Minh có thể thực hiện toàn bộ các việc sau trên đúng project `heartsync-dev`:

- kiểm tra và áp dụng database migrations;
- review schema, RLS, RPC và Realtime publication;
- quản lý người dùng Auth A/B/C phục vụ kiểm thử;
- kiểm tra bucket `profile-photos` và Storage policies;
- đặt và kiểm tra tên Edge Function Secrets;
- deploy, xem log và chẩn đoán Edge Functions;
- tạo Supabase Cron job và theo dõi lịch sử chạy;
- kiểm tra Auth redirect URLs, API settings và Function configuration;
- chạy SQL kiểm chứng chỉ đọc, database advisors/lint và sinh database types;
- thu thập bằng chứng cloud để nhóm nghiệm thu.

Phạm vi thao tác chỉ là `heartsync-dev`. Không thay đổi project khác trong cùng tài khoản.

## 2. Những quyền ngoài Supabase vẫn cần riêng

Tài khoản Supabase không tự cấp quyền ở các dịch vụ khác:

| Dịch vụ | Minh cần gì? | Khi nào cần? |
| --- | --- | --- |
| GitHub | Quyền pull/push nhánh repository | Sửa hoặc đẩy code |
| LiveKit Cloud | Project development và quyền tạo API key | Cấu hình media thật |
| Expo/EAS | Quyền vào EAS project HeartSync | Chỉ khi phải build Development APK mới |
| Android thật | Hai máy có Development Build | Nghiệm thu audio/video hai chiều |

Nếu chưa có LiveKit project, Minh có thể tạo một project development mới tên `heartsync-dev`, sau đó dùng URL/API key/API secret của project đó để cấu hình Supabase. Không đưa API secret vào Git, chat, ảnh chụp hoặc biến `EXPO_PUBLIC_*`.

## 3. Quy tắc thao tác bắt buộc

1. Chỉ chạy lệnh cloud khi terminal đang ở đúng repository và đã xác nhận project ref `namdkpfvieminzcoiskw`.
2. Không chạy `db reset` với remote/linked project.
3. Không sửa hoặc xóa migration đã tồn tại trong lịch sử cloud; mọi schema fix mới phải là migration forward mới.
4. Không chạy `migration repair` chỉ vì CLI gợi ý. Trước tiên phải so sánh migration local/remote và xác định nguyên nhân lệch.
5. Không chỉnh trực tiếp schema qua Table Editor/SQL Editor nếu thay đổi đó cần được lưu trong Git.
6. Chỉ một người chạy `db push` tại một thời điểm.
7. Không commit `.env`, database password, Supabase token, LiveKit key/secret, Vault secret hoặc APK.
8. Không tự tạo custom secret bắt đầu bằng `SUPABASE_`; Edge Runtime tự cung cấp các biến đó.

## 4. Giai đoạn A — nhận code và chạy quality gate

Tại máy Minh:

```powershell
git fetch origin
git checkout feature/video-call
git pull --ff-only origin feature/video-call
cd heartsync
npm ci
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo install --check
```

Chỉ tiếp tục lên Cloud khi các kiểm tra ứng dụng đạt. Nếu có thay đổi chưa commit từ công việc khác, không dùng reset/clean để xóa; tách hoặc bảo toàn trước khi chuyển nhánh.

## 5. Giai đoạn B — kiểm kê Cloud, chưa thay đổi dữ liệu

Repository đang pin Supabase CLI `2.122.0`. Luôn dùng `npx supabase` từ thư mục `heartsync`; không dùng CLI global hoặc `npx supabase@latest` vì CLI v3 đã thay đổi mặc định local/remote.

```powershell
npx supabase --version
npx supabase login
npx supabase --workdir .. link --project-ref namdkpfvieminzcoiskw
npx supabase --workdir .. migration list --linked
npx supabase --workdir .. db push --linked --dry-run
npx supabase --workdir .. functions list --project-ref namdkpfvieminzcoiskw
npx supabase --workdir .. secrets list --project-ref namdkpfvieminzcoiskw
```

Kết quả mong đợi:

- CLI hiển thị `2.122.0`;
- linked project là `heartsync-dev` / `namdkpfvieminzcoiskw`;
- dry-run không đề nghị reset database;
- danh sách pending migration được hiểu rõ trước khi chạy;
- function list và secret list phản ánh đúng trạng thái Cloud hiện tại.

Lưu output đã che thông tin nhạy cảm làm bằng chứng. Không chụp hoặc gửi giá trị secret.

## 6. Giai đoạn C — đối soát và áp dụng migrations

Các migration liên quan trực tiếp tới Chat/Calling/VideoCall là:

```text
20261104120000_messaging_calling.sql
20261105080739_fix_reorder_profile_photos_constraint.sql
20261105120000_video_call.sql
```

Migration `20261105120000_video_call.sql` phải có trên Cloud để RPC `start_call` nhận `video`. Migration `20261104120000_messaging_calling.sql` cung cấp messaging/calling lifecycle, cleanup queue và Realtime dependencies.

### Khi được phép tiếp tục

- local và remote history khớp ở tất cả migration đã triển khai;
- dry-run chỉ liệt kê migration thật sự chưa có trên Cloud;
- backup gần nhất đã được xác minh có file, kích thước lớn hơn 0 và đọc được bằng `pg_restore --list`;
- target vẫn là `namdkpfvieminzcoiskw`.

Sau khi review output, áp dụng bằng CLI đã pin:

```powershell
npx supabase --workdir .. db push --linked
```

### Phải dừng nếu

- dry-run liệt kê migration cũ từng chạy thủ công nhưng remote history không ghi nhận;
- CLI yêu cầu reset remote database;
- migration list có thứ tự bất thường hoặc nhiều file không nằm trong phạm vi review;
- target project/ref không đúng;
- xuất hiện lỗi liên quan đến migration history.

Trong các trường hợp này, lưu nguyên output và chẩn đoán trước; không dùng `migration repair`, `db reset` hoặc chạy lại SQL thủ công để “cho qua”.

## 7. Giai đoạn D — tạo LiveKit development project

Trong LiveKit Cloud:

1. Tạo project development tên `heartsync-dev`.
2. Lấy Project URL dạng `wss://...livekit.cloud`.
3. Tạo API key dành riêng cho HeartSync development.
4. Lưu an toàn ba giá trị:
   - `LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
5. Tạo thêm chuỗi ngẫu nhiên mạnh làm `CALL_CLEANUP_SECRET`.

Có thể tạo chuỗi cleanup trong PowerShell mà không in ra terminal:

```powershell
$cleanupBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($cleanupBytes)
[Convert]::ToBase64String($cleanupBytes) | Set-Clipboard
```

## 8. Giai đoạn E — đặt Function Secrets

Vào đúng project:

```text
Supabase Dashboard
  -> Edge Functions
  -> Secrets
```

Đặt đủ bốn tên:

| Secret | Nguồn giá trị |
| --- | --- |
| `LIVEKIT_URL` | LiveKit Project URL |
| `LIVEKIT_API_KEY` | LiveKit development API key |
| `LIVEKIT_API_SECRET` | LiveKit development API secret |
| `CALL_CLEANUP_SECRET` | Chuỗi ngẫu nhiên vừa tạo |

Sau khi lưu, chỉ xác nhận **tên key tồn tại**. Không đưa giá trị vào file bàn giao. Secret mới có hiệu lực ngay; thay đổi secret không bắt buộc redeploy function.

## 9. Giai đoạn F — deploy hai Edge Functions

Source cần deploy:

- `supabase/functions/livekit-token/index.ts`
- `supabase/functions/call-media-cleanup/index.ts`
- cấu hình từng function trong `supabase/config.toml`

Deploy bằng API bundling, không cần Docker:

```powershell
npx supabase --workdir .. functions deploy livekit-token call-media-cleanup `
  --project-ref namdkpfvieminzcoiskw `
  --use-api
```

Xác minh:

```powershell
npx supabase --workdir .. functions list --project-ref namdkpfvieminzcoiskw
npx supabase --workdir .. secrets list --project-ref namdkpfvieminzcoiskw
```

Kỳ vọng có `livekit-token` và `call-media-cleanup`. Project dùng Auth signing key ES256; `config.toml` tắt legacy gateway verification, còn `livekit-token` tự xác thực Bearer JWT bằng `auth.getUser()` trước khi cấp token. Không bỏ bước xác thực trong source.

## 10. Giai đoạn G — kiểm tra Realtime và RPC

Chạy query chỉ đọc trong SQL Editor:

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in ('messages', 'calls', 'matches')
order by tablename;
```

Kỳ vọng có đủ `calls`, `matches`, `messages`.

Kiểm tra định nghĩa `start_call`:

```sql
select pg_get_functiondef(
  'public.start_call(uuid, public.call_type)'::regprocedure
);
```

Hàm phải chấp nhận cả `audio` và `video`, kiểm tra Match active, participant, busy state và timeout. Không được còn nhánh `audio_only_in_mvp`.

## 11. Giai đoạn H — tạo Cron cleanup

Chỉ tạo Cron sau khi hai Edge Functions đã deploy và basic call đã hoạt động.

Trong Dashboard:

```text
Integrations -> Cron -> Jobs -> Create job
```

Cấu hình:

- tên job: `heartsync-call-media-cleanup`;
- lịch: `* * * * *`;
- loại: HTTP request hoặc Supabase Edge Function;
- method: `POST`;
- endpoint: `https://namdkpfvieminzcoiskw.supabase.co/functions/v1/call-media-cleanup`;
- body: `{}`;
- header: `Authorization: Bearer <CALL_CLEANUP_SECRET>`; giá trị thật lấy từ nơi lưu an toàn, không ghi vào tài liệu.

Nếu tạo bằng SQL/`pg_net`, lưu URL và secret trong Supabase Vault rồi đọc từ Vault khi tạo request; không ghi secret trực tiếp vào migration hoặc SQL đã commit.

Sau khi tạo, mở Cron Job History và Function Logs. HTTP `200` là bình thường; `401` thường là secret không khớp; `503` thường là thiếu backend config, migration/RPC hoặc LiveKit lỗi.

## 12. Giai đoạn I — Auth, Storage và dữ liệu kiểm thử

Minh có thể thay Công kiểm tra các nền tảng chung sau:

### Auth

- redirect allowlist có `heartsync://auth/callback` và `heartsync://auth/recovery`;
- ba tài khoản A/B/C đăng nhập được;
- A/B có profile hoàn chỉnh từ 18 tuổi trở lên và Match active;
- C không thuộc Match A/B;
- session restore, sign out và recovery callback vẫn hoạt động.

### Storage

- bucket `profile-photos` là private;
- đường dẫn ảnh luôn thuộc thư mục `<auth.uid()>/`;
- người dùng không upload/xóa/reorder ảnh của người khác;
- profile có tối đa sáu ảnh và chỉ một ảnh chính.

### Privacy/RLS

- public projection không trả email, DOB hoặc tọa độ chính xác;
- C không xem/gửi message, accept/end call hoặc xin LiveKit token của A/B;
- unmatch/block ngăn call/token mới;
- Edge Function secret và service-role key không xuất hiện trong mobile bundle/log.

## 13. Giai đoạn J — kiểm thử hai Android

Cloud changes không yêu cầu build APK mới. Chỉ build lại nếu Development APK đang cài chưa chứa LiveKit/WebRTC native modules hoặc chưa có quyền camera/microphone.

Chạy Metro:

```powershell
cd heartsync
npx expo start --dev-client --tunnel --clear
```

Test A/B trên hai máy và dùng C để kiểm tra từ chối quyền:

1. A gọi audio cho B; B nhận, accept, nghe hai chiều, mute/unmute và end.
2. A gọi video cho B; hai bên thấy/nghe nhau, đổi camera, tắt/bật camera và mute.
3. Test decline, cancel, timeout 45 giây và busy state.
4. Test permission denied, mất mạng, background/foreground và kill app.
5. Test unmatch/block khi đang hoặc chuẩn bị gọi.
6. C thử đọc/gửi/join/token call A/B và phải bị từ chối.
7. Sau khi thoát, camera/microphone phải tắt; cleanup job phải xử lý queue còn lại.

## 14. Bằng chứng Minh cần bàn giao cho nhóm

Không gửi secret. Chỉ bàn giao:

- branch/commit đã test;
- thời gian và tên môi trường deploy;
- output đã redact của `migration list` và `db push --dry-run`;
- danh sách migration đã áp dụng;
- tên hai Edge Functions và trạng thái deploy;
- xác nhận bốn **tên** secret tồn tại;
- kết quả query Realtime publication;
- Cron history và Function Logs đã che dữ liệu nhạy cảm;
- bảng kết quả A/B/C;
- video hoặc screenshot hai Android gọi audio/video thành công;
- lỗi còn lại kèm bước tái hiện và log đã redact.

## 15. Definition of Done cho phần Minh thay Công

- [ ] Local quality gate đạt.
- [ ] Migration local/remote đã khớp và migration cần thiết đã lên `heartsync-dev`.
- [ ] LiveKit development project hoạt động.
- [ ] Bốn Function Secrets tồn tại.
- [ ] `livekit-token` và `call-media-cleanup` đã deploy.
- [ ] Realtime có `calls`, `matches`, `messages`.
- [ ] Cron cleanup chạy và có lịch sử `200`.
- [ ] Auth/Storage/RLS A/B/C đạt.
- [ ] AudioCall A/B hoạt động trên hai Android.
- [ ] VideoCall A/B hoạt động trên hai Android.
- [ ] C/non-member bị server từ chối.
- [ ] Unmatch/block và thoát app giải phóng media đúng.
- [ ] Không có secret trong Git, `.env` commit, APK hoặc log bàn giao.

## 16. Tài liệu liên quan

- [`VIDEO_CALL_CLOUD_SETUP_GUIDE.md`](VIDEO_CALL_CLOUD_SETUP_GUIDE.md)
- [`SUPABASE_ADMIN_HANDOFF_VIDEO_CALL.md`](SUPABASE_ADMIN_HANDOFF_VIDEO_CALL.md)
- [`MODULE3_RUNBOOK.md`](MODULE3_RUNBOOK.md)
- [`TEAM_HANDOFF.md`](TEAM_HANDOFF.md)
- [Supabase CLI reference](https://supabase.com/docs/reference/cli/introduction)
- [Deploy database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Deploy Edge Functions](https://supabase.com/docs/guides/functions/deploy)
- [Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
- [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
- [Supabase Cron quickstart](https://supabase.com/docs/guides/cron/quickstart)
