# HƯỚNG DẪN CÀI ĐẶT, CHẠY DỰ ÁN & QUÉT APP TRÊN ĐIỆN THOẠI ANDROID
> **Dành cho:** Thành viên nhóm HeartSync (Công, Minh, Hảo)
> **Cập nhật ngày:** 02/11/2026
> **Mục tiêu:** Hướng dẫn chi tiết từng bước từ cài đặt code trên máy tính đến cài app APK và quét mã QR để code Hot Reload trực tiếp trên điện thoại thật.

---

## 📋 TỔNG QUAN NGUYÊN LÝ HOẠT ĐỘNG
* Dự án HeartSync sử dụng **Expo Development Build** thay vì Expo Go thông thường (do app có tích hợp các thư viện Native đặc thù: WebRTC cho cuộc gọi thoại/video và SQLite lưu phiên đăng nhập).
* **Quy trình:** Cài Development APK một lần cho mỗi phiên bản native. Mỗi ngày, chạy Metro và quét QR để nạp JavaScript/TypeScript. Chỉ build APK mới khi thay native package hoặc native configuration.

---

## 💻 PHẦN 1: THIẾT LẬP DỰ ÁN TRÊN MÁY TÍNH (CHO THÀNH VIÊN MỚI)

### Bước 1: Chuẩn bị môi trường máy tính
* Cài đặt **Node.js** (Khuyên dùng bản ổn định **Node 20 LTS** trở lên): Tải tại [nodejs.org](https://nodejs.org/).
* Cài đặt **Git** và trình soạn thảo mã nguồn **VS Code**.

### Bước 2: Kéo code từ GitHub về máy
Mở terminal (PowerShell hoặc Git Bash) và di chuyển vào thư mục dự án:
```powershell
# Cập nhật danh sách nhánh mới nhất từ GitHub
git fetch origin

# Chuyển sang nhánh tính năng được phân công:
# 👉 Nếu là Minh:
git checkout feat/discovery-match

# 👉 Nếu là Hảo:
git checkout feat/chat-audio-call

# 👉 Nếu là Công:
git checkout feat/profile-preferences
```

### Bước 3: Cài đặt các gói thư viện (Dependencies)
Di chuyển vào thư mục ứng dụng `heartsync` và cài đặt đúng phiên bản từ file lock:
```powershell
cd heartsync
npm ci
```
*(Lưu ý: Luôn dùng lệnh `npm ci` để đảm bảo thư viện cài đặt đồng bộ 100% giữa tất cả các thành viên).*

### Bước 4: Cấu hình biến môi trường kết nối Backend
1. Tại thư mục `heartsync/`, copy file mẫu `.env.example` thành file `.env`:
   ```powershell
   copy .env.example .env
   ```
2. Mở file `.env` vừa tạo và điền thông tin Supabase được cấp:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://<du-an-supabase>.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   *(Lưu ý: File `.env` này đã được cấu hình ẩn khỏi Git, tuyệt đối không gửi các key bí mật `service_role key` vào đây).*

---

## 📱 PHẦN 2: CÀI ĐẶT ỨNG DỤNG LÊN ĐIỆN THOẠI ANDROID

> ⚠️ **LƯU Ý QUAN TRỌNG:**
> **Không sử dụng ứng dụng Expo Go trên CH Play** vì sẽ bị văng app lỗi thiếu module Native. Thay vào đó, bạn sẽ cài bản **HeartSync Development Build**.

### Cách 1: Tải file APK đã build sẵn (Nhanh nhất - Khuyên dùng)
1. Bạn Công (Trưởng nhóm) sẽ gửi link tải file `.apk` (được build từ EAS) qua Zalo/Drive cho Minh và Hảo.
2. Dùng điện thoại Android tải file `.apk` về.
3. Bấm cài đặt: Nếu điện thoại hỏi *"Cho phép cài đặt ứng dụng từ nguồn không xác định"*, hãy chọn **Đồng ý / Cho phép**.
4. Cài đặt hoàn tất, trên màn hình điện thoại sẽ xuất hiện icon ứng dụng **HeartSync**.

### Cách 2: Tự build file APK mới bằng tài khoản cá nhân (Tùy chọn)
Nếu bạn muốn tự build trực tiếp từ máy của mình:
```powershell
cd heartsync
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile development
```
Hệ thống Expo Cloud sẽ tự động đóng gói và gửi về cho bạn 1 đường link tải file APK.

---

## ⚡ PHẦN 3: KẾT NỐI & QUÉT MÃ QR ĐỂ CODE HÀNG NGÀY

Sau khi điện thoại đã có app HeartSync:

### Bước 1: Khởi động Metro Server trên máy tính
Tại thư mục `heartsync/`, gõ lệnh:
```powershell
npx expo start --dev-client --tunnel --clear
```
* Màn hình terminal sẽ xuất hiện một **Mã QR to màu đen trắng**.

---

### Bước 2: Quét mã QR từ điện thoại Android
1. Mở app **HeartSync** trên điện thoại lên.
2. Từ launcher hoặc Developer Menu của HeartSync, chọn quét QR/development server.
3. Hướng camera điện thoại quét mã QR trên màn hình máy tính.
4. App sẽ tải JavaScript bundle rồi mở HeartSync.

---

### Bước 3: Trải nghiệm tính năng Hot Reload (Sửa code tức thì)
* Mở file code bất kỳ trong VS Code (ví dụ chỉnh sửa một nút bấm, đổi màu sắc giao diện).
* Nhấn **`Ctrl + S`** (Lưu file).
* Fast Refresh thường cập nhật ngay mà không cần cài lại APK. Nếu thêm/cập nhật native package hoặc đổi native config, phải build APK development mới.

---

## 🔄 PHẦN 4: CÁC PHÍM TẮT TIỆN ÍCH TRONG KHI CHẠY

Tại cửa sổ Terminal máy tính đang chạy server Metro, bạn có thể bấm các phím tắt sau:
* Phím **`r`**: Nạp lại toàn bộ ứng dụng (Reload app).
* Phím **`m`**: Bật/Tắt Menu Gỡ lỗi (Developer Tools) trên màn hình điện thoại.
* Phím **`c`**: Xóa bộ nhớ đệm (Clear bundler cache).
* Tổ hợp **`Ctrl + C`**: Tắt server khi ngừng làm việc.

*(Trên điện thoại, bạn cũng có thể **Lắc nhẹ máy** để mở Developer Menu, bật tính năng kiểm tra Element hoặc xem log lỗi).*

---

## 🛠️ PHẦN 5: XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

### 1. Quét mã QR nhưng điện thoại báo "Could not connect to development server"
* **Nguyên nhân:** Máy tính và điện thoại không nhìn thấy nhau do:
  * Máy tính và điện thoại đang bắt 2 mạng Wi-Fi khác nhau.
  * Tường lửa (Windows Firewall) của máy tính chặn cổng 8081.
  * Mạng Wi-Fi công cộng/ở trường học chặn kết nối trực tiếp giữa 2 thiết bị nội bộ.
* **Cách khắc phục triệt để nhất:** Dùng cờ **`--tunnel`** (qua đường ống ngrok):
  ```powershell
  npx expo start --dev-client --tunnel
  ```
  *(Khi dùng `--tunnel`, máy tính dùng mạng gì, điện thoại dùng 4G hay Wi-Fi nào cũng đều quét và kết nối thông suốt 100%)*.

---

### 2. Vừa sửa file `.env` nhưng ứng dụng không nhận key mới
* **Nguyên nhân:** Biến môi trường được nạp vào lúc khởi động server Metro, sửa `.env` khi server đang chạy sẽ không tự nạp.
* **Khắc phục:** Bấm `Ctrl + C` để tắt server, sau đó chạy lại kèm cờ xóa cache:
  ```powershell
  npx expo start --dev-client --clear
  ```

---

### 3. Muốn dùng dây cáp USB (Tốc độ cao nhất, không cần Wi-Fi)
Nếu mạng chập chờn, bạn có thể cắm dây sạc nối máy tính và điện thoại:
1. Bật tính năng **Gỡ lỗi USB (USB Debugging)** trong mục *Cài đặt cho nhà phát triển* trên điện thoại.
2. Cắm cáp USB vào máy tính.
3. Mở terminal gõ:
   ```powershell
   adb reverse tcp:8081 tcp:8081
   npx expo start --dev-client --localhost
   ```
4. Điện thoại sẽ tự động nhận diện máy tính ngay lập tức mà không cần quét mã QR.

---

Chúc cả nhóm phát triển tính năng thuận lợi và hiệu quả! Mọi thắc mắc hãy trao đổi ngay trên nhóm nhé.
