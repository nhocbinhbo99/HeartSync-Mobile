# Module 3 — triển khai và kiểm thử

Mã nguồn trên nhánh feat/chat-audio-call đã được cập nhật trực tiếp. Chưa push/commit hoặc áp dụng migration lên cloud.

## Thay đổi

- Matches: avatar qua signed URL, chat preview, thời gian hoạt động, unread count, pagination, refresh và subscription inbox.
- Chat: header đối phương, bubble hai phía, nhóm ngày, danh sách đảo, lịch sử theo cursor (sent_at,id), optimistic send UUID Expo Crypto, retry cùng UUID, merge ACK/realtime/readAt.
- Read receipts chỉ gửi danh sách ID thật sự visible khi app active và chat focus. Khi mất quyền, chat tắt composer, hủy subscription và ẩn dữ liệu bị block; unmatch giữ lịch sử chỉ đọc.
- Incoming call Modal ở cấp ứng dụng, reconcile snapshot khi foreground và định kỳ 5 giây.
- Audio dùng service factory native lazy, kiểm tra micro, snapshot/realtime, mute/unmute, thời lượng và cleanup khi rời màn hình. Guards ngăn tác vụ async cũ bật lại micro.
- Migration mới: RPC gửi tin idempotent, mark-read, summaries, busy locks cho cả hai participant, 45 giây ringing, terminal transitions idempotent, trigger kết thúc call khi unmatch và hàng đợi dọn media.
- Edge token giới hạn microphone. Worker call-media-cleanup xóa participant qua LiveKit server API, retry queue khi provider lỗi.
- Database types mới là overlay thủ công trong services/supabase.ts; database.types.ts vẫn là file generated cũ. Sau khi áp dụng migration, generate lại types từ development rồi hợp nhất overlay.

## Bước backend cần thực hiện

1. Review và chạy migrations trên Supabase local trước. Máy thực hiện hiện chưa có Docker nên chưa chạy Supabase pgTAP/gateway/Realtime local. File mới: supabase/migrations/20261104120000_messaging_calling.sql. Không chỉnh/sửa lại migration cũ đã apply.
2. Sau khi xác nhận đúng development project, áp dụng migration mới bằng quy trình migration của nhóm. Không reset database cloud. Chạy supabase/tests/module3_security.sql trên môi trường test; script dùng transaction và rollback.
3. Deploy lại livekit-token và deploy call-media-cleanup. Cấu hình functions nằm trong supabase/config.toml. livekit-token xác thực JWT người dùng; cleanup tự xác thực một shared secret backend.
4. Cấu hình Supabase Function Secrets: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, SUPABASE_PUBLISHABLE_KEY và CALL_CLEANUP_SECRET (chuỗi ngẫu nhiên mạnh chỉ backend). SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY do môi trường Edge cung cấp. Không đưa secret vào EXPO_PUBLIC_*.
5. Tạo Supabase Cron job gọi POST /functions/v1/call-media-cleanup mỗi phút, Authorization: Bearer <CALL_CLEANUP_SECRET>. Lưu secret trong Vault; không commit nó trong SQL. Theo dõi response processed/pending và retry khi HTTP 503. Worker là bước bắt buộc để hàng đợi dọn media được xử lý cả khi client offline.
6. Dùng LiveKit Cloud có token revocation, hoặc xác minh cơ chế revoke tương đương của server tự host. SDK disconnect ở client không tự thu hồi token đã phát. Cần kiểm thử token cũ không join lại sau worker removeParticipant; chưa có bằng chứng runtime trong môi trường này. Dọn media backend có độ trễ đến chu kỳ cron; client bình thường ngắt sớm qua realtime/polling.
7. Kiểm tra publication supabase_realtime có messages, calls; migration mới cũng thêm matches cho lifecycle event với RLS participant. Fallback hiện reconcile mỗi 5 giây.

## Chạy Android

Từ thư mục heartsync:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
npx expo run:android
```

Đã thêm expo-crypto và cập nhật các gói patch tương thích SDK 58 nên cần rebuild development APK. Những lần sau: npx expo start --dev-client --android. Điền Supabase URL và publishable key đúng vào file .env riêng; file này không được commit.

## Kiểm tra local

```powershell
npm run typecheck
npm run lint
npm test -- --ci
npx expo-doctor
```

Edge Function: npx deno check supabase/functions/livekit-token/index.ts supabase/functions/call-media-cleanup/index.ts (chạy tại root).

Đã thực thi migration và các kiểm tra RPC/RLS riêng bằng PostgreSQL nhúng PGlite với auth.uid/roles giả lập và fixture A/B/C. Kiểm tra này không chứa Supabase Auth gateway, Realtime, cron hoặc LiveKit thật; không thay thế Supabase integration tests. Migration nền bỏ dòng cài pgcrypto trong harness nhúng vì không có extension đó; không thay đổi migration thật.

## Checklist hai máy Android thật

- A/B đã match hợp lệ. C không thuộc match.
- A gửi → B nhận; restart vẫn có lịch sử. Kéo lên tải hơn 40 tin, gồm nhiều tin trùng timestamp.
- B ngoài chat: unread tăng. B xem tin trong chat: A nhận read receipt; tin ở ngoài viewport không bị tự đánh dấu đã đọc.
- Retry sau mất mạng không tạo thêm message; reconnect lấy phần bị lỡ.
- Call đến khi B ở Profile/Discover vẫn hiện Modal. Kiểm tra accept, decline, cancel, timeout 45 giây và busy.
- Sau accept: hai bên nghe được audio; mute/unmute thực sự đổi audio, timer chỉ chạy sau remote media event.
- Android Back/kết thúc/mất quyền/unmatch/block phải giải phóng micro, đóng media hai bên và tạo cleanup queue.
- Worker xử lý queue, token đã phát không thể vào lại trên cấu hình LiveKit đang dùng.
- C bị server chặn đọc/gửi/mark-read/accept/end/token/cleanup queue.

## Giới hạn bằng chứng hiện tại

Chưa triển khai cloud, chưa chạy pgTAP trên Supabase thật và chưa test hai thiết bị/audio. Mã có polling 5 giây để khôi phục sự kiện bị lỡ và phát hiện quyền thay đổi; chưa nghiệm thu hiệu năng pin/mạng hoặc giao diện trên thiết bị. Không đánh dấu Module 3 nghiệm thu hoàn tất trước khi các bước trên qua.

## UC17 — video call (nhánh `feature/video-call`)

- **Code:** Chat có nút gọi video; incoming overlay và route phân biệt audio/video. Gateway cấp trạng thái camera local/remote, mute, tắt/bật/đổi camera và giải phóng media khi rời màn. Màn video có remote view và local preview. Đây là bằng chứng mã nguồn, chưa phải bằng chứng chạy hai máy.
- **Database:** review và chạy migration forward `20261105120000_video_call.sql` trên local trước; chạy `module3_security.sql` (14 assertion), rồi mới áp dụng trên đúng dự án development. Migration cũ giữ nguyên. Công review SQL/RLS/Edge Function trước khi merge.
- **Edge:** deploy lại `livekit-token` sau migration; token audio chỉ có microphone, video có microphone/camera; cả hai cần call accepted, type khớp và Match active. Giữ `verify_jwt = true` và secrets ở backend. Worker cleanup/cron và token revocation vẫn bắt buộc.
- **Android:** dùng Development Build có plugin WebRTC và quyền CAMERA/RECORD_AUDIO. Kiểm thử A/B trên hai máy: nhận lời mời ngoài Chat, accept/decline, video hai chiều, local preview, đổi/tắt/bật camera, mute micro, end, timeout, mất mạng, unmatch/block, từ chối quyền. Kiểm tra camera/micro tắt sau khi thoát. C không được gọi hoặc lấy token.
- **Trạng thái:** chưa triển khai cloud, chưa có bằng chứng hai máy; không đánh dấu UC17 hoàn tất cho tới khi các bước trên qua. CLI Supabase trong `heartsync/package.json` đã pin; xem `supabase migration --help` trước thao tác cloud, tránh dùng CLI global v3 với quy trình v2.
