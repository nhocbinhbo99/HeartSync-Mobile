# Android — chạy chung cho nhóm HeartSync

## Sau khi pull/merge phiên bản này

Mỗi người cần Node hỗ trợ Expo SDK 58, Android SDK/NDK và JDK của Android Studio; chuẩn bị file heartsync/.env với Supabase URL và publishable key của development. Windows nên đặt repo trong đường dẫn ngắn, ví dụ C:\dev\HeartSync-Mobile. Android Studio chỉ cần mở máy ảo; có thể chạy toàn bộ lệnh ở terminal VS Code.

Tại thư mục heartsync:

```powershell
npm ci
npm run android:build
```

Lệnh android:build áp dụng config plugin bằng prebuild --no-clean rồi build/cài APK qua Expo. Chọn máy ảo đang bật hoặc điện thoại bật USB debugging và đã chấp nhận kết nối. Khi nhiều thiết bị cùng kết nối, dùng npx expo run:android --device sau bước prebuild để chọn.

Sau lần build native đầu tiên, công việc JS/TS hằng ngày:

```powershell
npx expo start --dev-client
```

Nhấn a cho máy Android kết nối USB/máy ảo. Với điện thoại dùng LAN, cùng mạng với PC và mở URL/QR trong development client.

Nếu nhóm chia sẻ APK: build/cài APK mới từ cùng commit trước khi mở Metro. APK cũ thiếu ExpoCrypto sẽ không chạy được code mới chỉ bằng reload.

## Bản sửa Windows dùng chung

heartsync/plugins/withWindowsNativeBuild.js được đăng ký trong app.json và sinh cấu hình Gradle khi prebuild:
- CMAKE_OBJECT_PATH_MAX=240 để CMake hash những đường dẫn object C++ quá dài.
- --driver-mode=g++ để compiler giữ chế độ C++ khi Windows gọi clang++.exe qua tên 8.3.
- Với module app, output CMake được đặt trong thư mục ngắn `.hs/` cạnh checkout; nhờ vậy đường dẫn object cho ARM64 không vượt giới hạn Windows. Thư mục này là cache sinh ra khi build, không cần commit.
- Đăng ký qua finalizeDsl trước khi Expo root plugin đánh giá subprojects.
- Chỉ áp dụng trên Windows. Linux/EAS/macOS không nhận các cờ này.

Không hardcode đường dẫn SDK/NDK của một thành viên vào config plugin. local.properties, android/ và cache native vẫn bị Git bỏ qua. Chỉ cần commit app.json, package.json và thư mục plugins/ cùng phần code/dependency của Module 3.

Nếu đã có android/ cũ: npm run android:build sẽ cập nhật cấu hình qua --no-clean. Chỉ dùng prebuild --clean khi có lý do tạo lại toàn bộ native project; Expo SDK 58 mặc định clean nên cần giữ --no-clean trong quy trình hằng ngày.

## Backend chung

Việc APK build được không thay thế cấu hình Supabase/LiveKit. Người phụ trách backend cần review/apply migration Module 3, deploy Edge Functions và kiểm tra hai tài khoản trên hai máy; xem MODULE3_RUNBOOK.md. Cấu hình đó thực hiện trên backend development chung, mỗi thành viên không cần tự tạo database khác.

## Kiểm tra

npm run typecheck, npm run lint, npm test -- --ci. Các test plugin kiểm tra thứ tự đăng ký hook và tính idempotent qua nhiều lần prebuild. Bản sửa còn cần được xác nhận trên các máy còn lại và trên điện thoại thật trước khi khẳng định tương thích toàn nhóm.

## APK khác khóa ký

Nếu máy báo INSTALL_FAILED_UPDATE_INCOMPATIBLE, APK hiện tại được ký khác khóa với APK mới. Muốn giữ dữ liệu cục bộ phải dùng đúng khóa ký cũ; không thể cài đè chỉ bằng -r. Với thiết bị test, sau khi người dùng đồng ý, gỡ app cũ rồi cài APK mới; dữ liệu lưu trên Supabase không bị xóa. Nhóm nên chia sẻ APK từ cùng nguồn build để tránh thay khóa ký giữa các bản cập nhật.

## Bằng chứng trên máy hiện tại

Build debug đã thành công cho cả `x86_64` (giả lập) và `arm64-v8a` (điện thoại Android), với SDK gốc ở đường dẫn có khoảng trắng, không đặt `ndk.dir` và không dùng Gradle init script riêng. `expo-doctor` 20/20, TypeScript, ESLint, static migration checks và Jest 24 suites / 90 tests đều qua. Audio hai chiều trên hai điện thoại vẫn cần backend Supabase/LiveKit development được deploy và nghiệm thu theo Module 3 Runbook.
