# HƯỚNG DẪN CẤU HÌNH LIVEKIT CLOUD & SUPABASE EDGE FUNCTION SECRETS

Tài liệu này hướng dẫn chi tiết từng bước tạo tài khoản LiveKit Cloud (miễn phí), lấy các thông số kết nối và cấu hình Secrets lên Supabase Dashboard để kích hoạt tính năng **Gọi thoại (Audio Call)** và **Gọi video (Video Call)** trong ứng dụng HeartSync.

---

## 1. Danh sách các Secrets cần cấu hình

| Tên Secret | Ý nghĩa | Nguồn lấy |
| :--- | :--- | :--- |
| `LIVEKIT_URL` | WebSocket URL máy chủ LiveKit | LiveKit Cloud Project Settings (`wss://...`) |
| `LIVEKIT_API_KEY` | Khóa API định danh dịch vụ | LiveKit Cloud Project Settings (`API...`) |
| `LIVEKIT_API_SECRET` | Khóa bảo mật ký token phòng gọi | LiveKit Cloud Project Settings |
| `CALL_CLEANUP_SECRET` | Khóa bảo vệ hàm dọn dẹp phòng gọi sau khi kết thúc | Chuỗi ngẫu nhiên do bạn tự tạo |

---

## 2. Bước 1: Đăng ký và lấy thông số LiveKit Cloud

1. Truy cập trang chủ: [https://cloud.livekit.io](https://cloud.livekit.io)
2. Đăng ký/Đăng nhập bằng tài khoản **Google** hoặc **GitHub** (gói Free Tier hoàn toàn miễn phí cho môi trường phát triển).
3. Tạo mới một Project:
   * **Project Name**: Đặt tên dự án (ví dụ: `heartsync-dev`).
   * Chọn vùng máy chủ gần nhất (khuyến nghị: **Singapore** - `ap-southeast-1` để có độ trễ âm thanh/hình ảnh thấp nhất tại Việt Nam).
4. Lấy thông tin kết nối:
   * Tại giao diện dự án, vào **Settings** ➡️ Chọn **Keys** (hoặc **Project Settings**).
   * **`LIVEKIT_URL`**: Sao chép URL hiển thị ở đầu trang (dạng: `wss://heartsync-xxxx.livekit.cloud`).
   * **`LIVEKIT_API_KEY`** & **`LIVEKIT_API_SECRET`**:
     * Bấm **Generate Key** (nếu chưa có).
     * Sao chép giá trị **API Key** và **API Secret**.

---

## 3. Bước 2: Tạo khóa `CALL_CLEANUP_SECRET`

Khóa này dùng để xác thực quyền khi hàm nội bộ gọi dọn dẹp media/phòng thoại sau khi cuộc gọi kết thúc:

Mở PowerShell trên máy tính và chạy lệnh tạo chuỗi ngẫu nhiên:
```powershell
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
```
*Kết quả sẽ là một chuỗi 64 ký tự hex ngẫu nhiên (ví dụ: `8a7f9b2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a`).*  
Bạn sao chép chuỗi này để làm giá trị cho `CALL_CLEANUP_SECRET`.

---

## 4. Bước 3: Cấu hình Secrets trên Supabase Dashboard

### Cách 1: Thêm trực tiếp trên giao diện Web (Khuyên dùng)
1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard).
2. Chọn project: **`heartsync-dev`** (hoặc project tương ứng của nhóm).
3. Ở menu thanh bên trái: Bấm chọn biểu tượng **Edge Functions** (biểu tượng `</>` hoặc hình tia sét).
4. Nhìn lên góc trên/thanh phụ, chọn tab **Secrets** (hoặc nút **Manage Secrets** / **Add new secret**).
5. Bấm nút **"New secret"** và thêm lần lượt 4 dòng:
   * **Name:** `LIVEKIT_URL`  
     **Value:** `wss://heartsync-xxxx.livekit.cloud`
   * **Name:** `LIVEKIT_API_KEY`  
     **Value:** `<API Key từ LiveKit>`
   * **Name:** `LIVEKIT_API_SECRET`  
     **Value:** `<API Secret từ LiveKit>`
   * **Name:** `CALL_CLEANUP_SECRET`  
     **Value:** `<Chuỗi ngẫu nhiên 64 ký tự tạo ở Bước 2>`
6. Bấm **Save**.

---

### Cách 2: Thêm qua Supabase CLI (Dành cho dòng lệnh)
Nếu máy bạn đã cài và link project với Supabase CLI:
```bash
supabase secrets set \
  LIVEKIT_URL="wss://heartsync-xxxx.livekit.cloud" \
  LIVEKIT_API_KEY="your_api_key" \
  LIVEKIT_API_SECRET="your_api_secret" \
  CALL_CLEANUP_SECRET="your_cleanup_secret"
```

---

## 5. Lưu ý bảo mật bắt buộc (QUAN TRỌNG)

> [!CAUTION]
> 1. **KHÔNG** dán các giá trị trên vào file `.env` của client mobile (`heartsync/.env`). Client chỉ nhận token tạm thời thời hạn 5 phút được cấp từ Edge Function.
> 2. **KHÔNG** gửi API Secret vào khung chat hay commit vào bất kỳ file nào đẩy lên GitHub.
> 3. Các biến này chỉ được lưu trữ an toàn trong vùng quản lý bí mật (Secrets) của Supabase Edge Functions.

---

## 6. Kiểm tra sau khi cấu hình

Khi người dùng vào màn hình Trò chuyện (Chat), bấm vào nút **Gọi thoại** hoặc **Gọi video**:
1. App gọi Edge Function `livekit-token`.
2. Supabase Edge Function đọc 4 secrets trên và tạo token thời hạn 5 phút cho người dùng.
3. Cuộc gọi kết nối thành công và cả hai bên có thể nghe/nói với nhau theo thời gian thực.
