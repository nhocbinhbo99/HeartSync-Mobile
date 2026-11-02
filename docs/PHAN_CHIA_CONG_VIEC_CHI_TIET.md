# BÁO CÁO TRẠNG THÁI HỆ THỐNG & KẾ HOẠCH PHÂN CHIA CÔNG VIỆC — DỰ ÁN HEARTSYNC

> **Đồ án:** Lập trình Thiết bị Di động (Mobile Development) — Năm 4, Kỳ 1
> **Nền tảng mục tiêu:** Android-first (Đã được giảng viên phê duyệt chỉ làm Android)
> **Công nghệ cốt lõi:** React Native, Expo SDK 58, TypeScript, Supabase Cloud, LiveKit
> **Môi trường chạy:** Expo Development Build (Chạy trực tiếp trên thiết bị Android thật)
> **Ngày cập nhật:** 02/11/2026

---

## 🏛️ PHẦN 1: TRẠNG THÁI HIỆN TẠI CỦA PROJECT & DATABASE

Để cả 3 thành viên (**Công, Minh, Hảo**) nắm rõ nền tảng hiện tại trước khi bắt tay vào code, dưới đây là hiện trạng kỹ thuật đã hoàn thành:

### 1.1. Trạng thái Mã nguồn & Ứng dụng Di động (Mobile App Baseline)
* **Cột mốc bàn giao:** `BASE_READY_FOR_PARALLEL_WORK` (Nền tảng đã sẵn sàng cho cả 3 người làm song song).
* **Kiến trúc phân tầng (Clean Architecture):**
  * `heartsync/src/features/`: Mã nguồn UI chia theo từng nhóm tính năng độc lập (auth, profile, preferences, discovery, matching, chat, calling, saved).
  * `heartsync/src/navigation/`: Hệ thống điều hướng hoàn chỉnh bằng React Navigation v7 (Bottom Tabs: *Discover, Saved, Matches, Profile*; Stack Navigation: *SignIn, SignUp, ForgotPassword, EditProfile, Chat, AudioCall, VideoCall, MatchFound*).
  * `heartsync/src/services/contracts.ts`: **Hợp đồng giao diện (Interfaces)** phân cách giữa màn hình và tầng dữ liệu. Màn hình giao diện **không được phép gọi trực tiếp** Supabase hay LiveKit mà phải thông qua các Repository/Gateway này.
  * `heartsync/src/shared/`: Theme màu sắc, typography, component dùng chung (AppButton, AppTextField, StatePanel) và các quy tắc nghiệp vụ cốt lõi đã được kiểm thử tự động.
* **Kết quả kiểm thử tự động (Quality Gates):**
  * **TypeScript:** PASS (`npm run typecheck` không có lỗi cú pháp/type).
  * **ESLint:** PASS (`npm run lint` đạt chuẩn code clean).
  * **Jest Tests:** PASS **16 suites / 58 tests** (bao quát logic tuổi, cặp kết đôi, bộ lọc, trạng thái gọi và dữ liệu demo cloud).
  * **Expo Doctor:** PASS **20/20 tiêu chí** tương thích thư viện.
  * **Android Native Prebuild & Hermes Engine:** PASS (Đã xuất bản bundle 1.258 modules / 5 MB thành công).
  * **Android Development Build:** APK EAS đã build thành công; nghiệm thu flow trên thiết bị vẫn cần được ghi nhận riêng.

---

### 1.2. Trạng thái Database & Backend Supabase Cloud
Backend đã được thiết lập và kiểm chứng thực tế trên dự án Cloud `heartsync-dev`:

* **Cấu hình kết nối:** Đã có URL và Publishable Key trong file `heartsync/.env`:
  ```env
  EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
  ```
* **Cơ chế xác thực (Authentication):**
  * Sử dụng luồng PKCE bảo mật cao.
  * Tự động lưu và khôi phục phiên đăng nhập (Session) vào cơ sở dữ liệu `expo-sqlite` nội bộ của điện thoại.
  * Đã cấu hình chuyển hướng (Redirect URLs): `heartsync://auth/callback` và `heartsync://auth/recovery`.
* **Cấu trúc 14 bảng dữ liệu (đều đã bật RLS):**
  1. `profiles`: Thông tin công khai của người dùng (tên, avatar hiển thị, bio, nghề nghiệp, học vấn, danh sách sở thích).
  2. `profile_private`: Dữ liệu owner-only gồm ngày sinh và tọa độ chính xác; không được trả về qua projection công khai.
  3. `profile_photos`: Ảnh hồ sơ, đường dẫn phải thuộc owner; migration MVP giới hạn `sort_order` từ 0–5 (tối đa 6 ảnh).
  4. `interests`, `profile_interests`, `profile_languages`: Danh mục và quan hệ sở thích/ngôn ngữ công khai.
  5. `user_preferences`: Khoảng tuổi 18–120, giới tính và ngôn ngữ ưu tiên; khoảng cách chỉ dùng khi có consent + toạ độ.
  6. `saved_profiles`, `swipes`, `matches`: Bookmark owner-only, trạng thái Like/Pass và cặp match UUID chuẩn hoá.
  7. `messages`, `calls`: Tin nhắn có `client_message_id` để khử trùng lặp và lifecycle cuộc gọi.
  8. `blocks`, `reports`: Chặn tương tác và tiếp nhận báo cáo riêng tư.
* **Supabase Storage (Lưu trữ hình ảnh):**
  * Đã tạo bucket riêng tư: `profile-photos` (Private Bucket).
  * Đã áp dụng 4 chính sách bảo mật (Storage Policies): Chỉ chủ sở hữu mới có quyền Upload/Xóa/Sửa ảnh của chính mình; người dùng khác chỉ được xem ảnh nếu tài khoản hợp lệ.
* **Các thủ tục lưu trữ an toàn (Database Functions / RPC):**
  * `record_swipe`: Hàm quẹt thẻ nguyên tử (Atomic transaction). Tự động ghi nhận lượt quẹt, kiểm tra nếu đối phương cũng đã thích mình thì tạo ngay bản ghi Match và trả về `matchId` tức thì mà không sợ bị xung đột đồng thời.
  * `unmatch`, `block_user`, `start_call`, `accept_call`, `reject_call`, `end_call`: Các RPC hỗ trợ đóng kết nối, chặn tương tác và lifecycle cuộc gọi an toàn.
* **LiveKit Calling Scaffold (Hạ tầng gọi điện):**
  * Đã tích hợp sẵn SDK LiveKit tương thích Expo SDK 58.
  * Đã có mẫu mã nguồn Supabase Edge Function `livekit-token` sẵn sàng để cấp token kết nối phòng gọi an toàn (token hết hạn sau 5 phút, không để lộ secret key ở phía ứng dụng di động).

---

## 👥 PHẦN 2: BẢNG PHÂN CHIA 19 USE CASES CHO 3 THÀNH VIÊN

| Thành viên | Nhánh Git phụ trách | Phạm vi chuyên môn chính | 19 Use Cases phân bổ |
|---|---|---|---|
| **Công** | `feat/profile-preferences` | **Xác thực, Hồ sơ, Tùy chọn tìm kiếm & DB Gate** | **UC01, UC02, UC03, UC04, UC05, UC06, UC11, UC12** |
| **Minh** | `feat/discovery-match` | **Sàn khám phá, Quẹt thẻ, Khớp đôi & An toàn** | **UC07, UC08, UC09, UC10, UC14, UC18, UC19** |
| **Hảo** | `feat/chat-audio-call` | **Danh sách tương hợp, Chat Realtime & Gọi thoại/Video** | **UC13, UC15, UC16, UC17** *(Test media trên 2 máy Android thật)* |

---

## 🛠️ PHẦN 3: CHI TIẾT CÔNG VIỆC TỪNG THÀNH VIÊN

---

### 1. NGUYỄN HOÀNG PHƯỚC THÀNH CÔNG (Trưởng nhóm)
* **Nhánh làm việc:** `feat/profile-preferences`
* **Trọng tâm:** Kết nối Auth thật, Quản lý hồ sơ cá nhân, Upload ảnh Storage, Cài đặt bộ lọc tìm kiếm & Danh sách đã lưu.

#### Danh sách Use Cases chi tiết:
1. **UC01 — Đăng ký tài khoản (Sign Up):**
   * Form đăng ký: Email, Mật khẩu ($\ge 8$ ký tự), Họ tên hiển thị, Ngày sinh (ràng buộc $\ge 18$ tuổi), Giới tính.
   * Gọi `supabase.auth.signUp()`, xử lý xác thực email.
2. **UC02 — Đăng nhập (Sign In):**
   * Đăng nhập Email/Password với Supabase PKCE Auth.
   * Tự động lưu và phục hồi Session khi mở lại ứng dụng qua `expo-sqlite`.
3. **UC03 — Quên mật khẩu & Khôi phục (Password Recovery):**
   * Gửi link xác nhận về email $\rightarrow$ Bấm link nhảy về app qua deep link `heartsync://auth/recovery` $\rightarrow$ Mở `UpdatePasswordScreen` để đổi mật khẩu mới.
4. **UC04 — Đăng xuất (Sign Out):**
   * Gọi `supabase.auth.signOut()`, xoá sạch session token, chuyển về màn hình Auth.
5. **UC05 — Quản lý hồ sơ cá nhân (Profile Management):**
   * Màn hình `ProfileScreen` và `EditProfileScreen`.
   * Cho phép chọn ảnh từ thư viện máy thật (`expo-image-picker`), nén và upload lên bucket riêng tư `profile-photos` của Supabase Storage (tối đa 6 ảnh, sắp xếp ảnh đại diện đầu tiên).
   * Cập nhật: Tiểu sử (Bio), Nghề nghiệp, Học vấn, Danh sách sở thích (Passions).
   * **Bảo mật:** Tọa độ GPS chính xác và Ngày sinh không bao giờ được trả về trong DTO công khai (`ProfilePublic`).
6. **UC06 — Thiết lập bộ lọc tìm kiếm (Preferences):**
   * Màn hình `FiltersScreen` / Cài đặt: Lọc tuổi (18 – 120), khoảng cách tối đa (1 – 500 km), giới tính ưu tiên, ngôn ngữ.
   * Xin quyền GPS (`expo-location`) một cách tường minh, lưu vị trí ước tính vào preferences.
7. **UC11 & UC12 — Lưu hồ sơ & Danh sách đã lưu (Saved Profiles):**
   * Nút đánh dấu Bookmark ứng viên khi đang xem.
   * Màn hình Tab `Saved`: Tải danh sách các hồ sơ người dùng đã lưu lại để xem sau.

* **File code trọng tâm:**
  * UI: `heartsync/src/features/auth/`, `heartsync/src/features/profile/`, `heartsync/src/features/preferences/`, `heartsync/src/features/saved/`
  * Repository Adapters: Hoàn thiện `ProfileRepository`, `PreferencesRepository`, `SavedProfilesRepository` trong `heartsync/src/services/`.

---

### 2. MINH
* **Nhánh làm việc:** `feat/discovery-match`
* **Trọng tâm:** Khám phá ứng viên (Discovery Deck), Cử chỉ quẹt thẻ (Swipe), Gọi RPC khớp đôi nguyên tử, Màn hình Match Found, Hủy kết đôi & Chặn.

#### Danh sách Use Cases chi tiết:
1. **UC07 — Khám phá hồ sơ ứng viên (Discovery Deck):**
   * Màn hình Tab `Discover`: Chồng thẻ ứng viên (Card Deck) mượt mà.
   * Hiển thị: Danh sách ảnh đại diện, Tên hiển thị, Tuổi (tính tự động từ năm sinh, không lộ ngày sinh), Khoảng cách (km), Nghề nghiệp, Sở thích.
   * Ứng dụng bộ lọc đã lưu từ Preferences; **loại trừ**: Bản thân, người đã quẹt, người bị chặn.
   * Xử lý trạng thái hết thẻ (*Empty State*).
2. **UC08 — Xem chi tiết hồ sơ (Other Profile Detail):**
   * Bấm vào thẻ để mở màn hình chi tiết `OtherProfileScreen` xem toàn bộ ảnh cỡ lớn, bio đầy đủ và sở thích chi tiết.
3. **UC09 — Thích hồ sơ (Swipe Right / Like):**
   * Cử chỉ vuốt thẻ sang phải hoặc bấm nút Trái tim (Like).
   * Gọi `MatchRepository.recordSwipe(targetId, 'LIKE')` (sử dụng hàm RPC nguyên tử `record_swipe` của Supabase).
   * **Kiểm tra kết đôi 2 chiều:** Nếu đối phương cũng đã Like mình trước đó, server trả về `matched: true` kèm `matchId`.
4. **Màn hình popup "Match Found!":**
   * Khi `matched: true`, hiển thị ngay màn hình chúc mừng `MatchFoundScreen` với hiệu ứng sinh động và 2 avatar của 2 người.
   * 2 lựa chọn:
     * **"Nhắn tin ngay":** Điều hướng sang màn hình Chat với `matchId` vừa sinh (kết nối trực tiếp sang module của Hảo).
     * **"Tiếp tục quẹt":** Đóng popup và chuyển sang thẻ ứng viên tiếp theo.
5. **UC10 — Bỏ qua hồ sơ (Swipe Left / Pass):**
   * Cử chỉ vuốt sang trái hoặc bấm nút X (Pass). Gọi `record_swipe(targetId, 'PASS')`. Thẻ tiếp theo trượt lên.
6. **UC14 — Hủy kết đôi (Unmatch):**
   * Nút Hủy kết đôi tại trang chi tiết ứng viên hoặc menu chat. Gọi hàm hủy tương hợp.
7. **UC18 & UC19 — Chặn (Block) & Báo cáo (Report):**
   * Menu Chặn / Báo cáo trên hồ sơ ứng viên. Chặn xong tự động ẩn vĩnh viễn khỏi danh sách khám phá.

* **File code trọng tâm:**
  * UI: `heartsync/src/features/discovery/`, `heartsync/src/features/matching/`
  * Repository Adapters: Hoàn thiện `DiscoveryRepository`, `MatchRepository` trong `heartsync/src/services/`.

---

### 3. HẢO
* **Nhánh làm việc:** `feat/chat-audio-call`
* **Trọng tâm:** Danh sách kết đôi (Matches), Nhắn tin thời gian thực (Realtime Chat), gọi thoại và gọi video LiveKit trên 2 máy Android thật.

#### Danh sách Use Cases chi tiết:
1. **UC13 — Xem danh sách kết đôi (Matches List):**
   * Màn hình Tab `Matches`:
     * Hàng bong bóng avatar phía trên: Danh sách người mới match gần đây.
     * Danh sách hội thoại phía dưới: Danh sách các cuộc trò chuyện (avatar, tên, tin nhắn cuối, thời gian, trạng thái đã đọc/chưa đọc).
2. **UC15 — Nhắn tin trực tuyến (Realtime Chat):**
   * Màn hình `ChatScreen` (nhận tham số `matchId` và `recipientProfile`):
     * Giao diện bong bóng tin nhắn (tin của mình bên phải, đối phương bên trái), khung nhập văn bản và nút gửi.
     * **Realtime với Supabase:** Lắng nghe sự kiện `INSERT` trên bảng `messages` thông qua Supabase Channel.
     * **Optimistic Update & Khử trùng lặp:** Hiển thị tin nhắn ngay khi bấm gửi; khi Supabase bắn event về thì dùng `clientMessageId` để đối chiếu, tránh bị lặp đôi 1 tin nhắn.
     * Tự động hủy lắng nghe (unsubscribe) khi rời khỏi màn hình hoặc khi một trong hai người bấm Unmatch/Block.
3. **UC16 — Gọi thoại (Audio Call - LiveKit):**
   * Nút gọi điện trên thanh tiêu đề màn hình Chat.
   * Màn hình `AudioCallScreen`:
     * Xin quyền Micro trên Android (`RECORD_AUDIO`).
     * Lấy token kết nối phòng gọi từ Edge Function `livekit-token` (thời hạn 5 phút).
     * Kết nối vào LiveKit Room qua `CallGateway`.
     * Giao diện: Avatar đối phương, đồng hồ đếm giờ gọi, nút Bật/Tắt Micro (Mute), nút Bật Loa ngoài (Speaker), nút Cúp máy (End Call).
4. **UC17 — Gọi video (Video Call - LiveKit):**
   * Nút gọi video trên thanh tiêu đề màn hình Chat.
   * Màn hình `VideoCallScreen`: xin quyền Camera và Micro (`CAMERA`, `RECORD_AUDIO`), kết nối LiveKit Room, truyền/hiển thị track video và audio cục bộ/từ xa.
   * Giao diện có video đối phương, preview camera của mình, lật camera, bật/tắt camera, mute và cúp máy.
   * Nghiệm thu bằng cuộc gọi media thực tế giữa hai máy Android development build.

* **File code trọng tâm:**
  * UI: `heartsync/src/features/chat/`, `heartsync/src/features/calling/`
  * Repository & Gateway Adapters: Hoàn thiện `ChatRepository`, `CallGateway` trong `heartsync/src/services/`.

---

## 🔗 PHẦN 4: NGUYÊN TẮC GHÉP NỐI & QUY TRÌNH PHỐI HỢP

### 4.1. Điểm ghép nối trực tiếp giữa các thành viên:
1. **Minh $\rightarrow$ Hảo (Match $\rightarrow$ Chat):**
   * Khi Minh xử lý màn hình `MatchFoundScreen`, nút "Nhắn tin ngay" sẽ gọi:
     ```typescript
     navigation.navigate('Chat', { matchId: confirmedMatchId, recipient: matchedProfile });
     ```
   * Hảo chỉ cần đọc `route.params.matchId` để load lịch sử và kết nối Realtime.
2. **Công $\rightarrow$ Minh (Profile $\rightarrow$ Discovery):**
   * Công phụ trách lưu chuẩn dữ liệu Profile và Preferences vào Supabase.
   * Minh chỉ cần gọi `DiscoveryRepository.getCandidates()` để lấy danh sách ứng viên đã được lọc sẵn từ Backend.

### 4.2. Quy tắc lập trình bắt buộc (Clean Architecture):
* **Tuyệt đối không import trực tiếp Supabase hay LiveKit vào màn hình UI (Screen).**
* Mọi hành động lấy hoặc gửi dữ liệu phải gọi qua các hàm Interface trong [`heartsync/src/services/contracts.ts`](../heartsync/src/services/contracts.ts).

---

## 📱 PHẦN 5: HƯỚNG DẪN BUILD APK DEVELOPMENT & CHẠY TRÊN MÁY ANDROID

Do giảng viên đã thống nhất chỉ làm Android, nhóm sẽ dùng cơ chế **Expo Development Build** để chạy mượt mà cả WebRTC và Auth:

### 1. Build file APK Development (Chỉ cần 1 người build ĐÚNG 1 LẦN DUY NHẤT):
Tại thư mục `heartsync/`, chạy các lệnh sau:
```powershell
# Đăng nhập tài khoản Expo
npx eas-cli@latest login

# Dự án đã được liên kết EAS; tạo APK development Android
npx eas-cli@latest build --platform android --profile development
```
* Sau 10–15 phút, hệ thống sẽ cấp một link tải file `.apk`. Cả 3 người tải file này về cài vào điện thoại Android của mình.

### 2. Chạy ứng dụng hàng ngày (Quét mã QR & Hot Reload):
Khi muốn code và xem trực tiếp trên điện thoại:
```powershell
cd heartsync
npx expo start --dev-client --tunnel --clear
```
* Mở app HeartSync Development trên điện thoại $\rightarrow$ quét QR từ launcher/developer menu.
* Khi bạn sửa TypeScript/UI trong VS Code và nhấn `Ctrl + S`, Fast Refresh thường cập nhật mà không cần build APK mới. Chỉ build lại khi thay native package hoặc native configuration.

---

## 💻 PHẦN 6: CÂU LỆNH GIT CHO TỪNG THÀNH VIÊN ĐỂ BẮT ĐẦU

### 👉 Dành cho Minh (ở máy tính của Minh):
```powershell
git fetch origin
git checkout feat/discovery-match
cd heartsync
npm ci
```

### 👉 Dành cho Hảo (ở máy tính của Hảo):
```powershell
git fetch origin
git checkout feat/chat-audio-call
cd heartsync
npm ci
```

### 👉 Dành cho Công (ở máy tính của bạn):
```powershell
git checkout feat/profile-preferences
cd heartsync
```

---

## 📅 PHẦN 7: KẾ HOẠCH TIẾN ĐỘ ĐỀ XUẤT (3 TUẦN)

* **Tuần 1: Hoàn thiện giao diện (UI) & Dữ liệu mẫu (Mock Data)**
  * Công: Dựng xong giao diện Profile, chọn ảnh thư viện, form Preferences.
  * Minh: Dựng xong giao diện vuốt thẻ Discovery Deck, modal chi tiết, popup Match Found.
  * Hảo: Dựng xong giao diện danh sách Matches, khung Chat, giao diện màn hình gọi Calling.
* **Tuần 2: Nối API Supabase Cloud & Realtime**
  * Công: Nối Auth thật, lưu Profile và upload ảnh lên Storage bucket.
  * Minh: Nối hàm `record_swipe` RPC thật vào cử chỉ vuốt thẻ.
  * Hảo: Kết nối Realtime Chat 1-1 qua Supabase Channel.
* **Tuần 3: Ghép nối LiveKit Calling & Kiểm thử 2 máy thật**
  * Deploy Supabase Edge Function `livekit-token`.
  * Hảo thực hiện kết nối cuộc gọi thoại và video trên 2 máy Android thật.
  * Hợp nhất 3 nhánh vào `main`, chuẩn bị tài liệu báo cáo và slide nộp cho giảng viên.
