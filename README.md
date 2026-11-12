# HeartSync Mobile

Ứng dụng hẹn hò Android-first xây dựng bằng **React Native / Expo (SDK 58)**, **TypeScript**, **Supabase** và **LiveKit**.

## Công nghệ sử dụng

- **Mobile App (`heartsync/`)**: Expo SDK 58, React Native, TypeScript, React Navigation v7 (Native Stack + Bottom Tabs).
- **Backend & Database (`db/`, `supabase/`)**: Supabase Auth, PostgreSQL với Row Level Security (RLS), Private Storage (`profile-photos`), Supabase Realtime và Edge Functions (`ai-assistant`, `livekit-token`, `call-media-cleanup`).
- **Tính năng nổi bật**: Khám phá & vuốt thẻ (like/pass/undo), kết nối đôi bên (Match), nhắn tin realtime, gọi thoại & video qua LiveKit, lưu hồ sơ yêu thích, bộ lọc độ tuổi/giới tính/ngôn ngữ/bán kính GPS và trợ lý AI gợi ý bio / câu mở đầu.

## Cấu trúc thư mục

```text
HeartSync-Mobile/
├── db/
│   └── heartsync_schema.sql      # Toàn bộ schema DB, RLS, Storage, RPCs & triggers
├── heartsync/                    # Mã nguồn ứng dụng Expo / React Native
│   ├── assets/                   # Icons, ảnh minh họa, font Nunito, ảnh đại diện mẫu
│   └── src/
│       ├── features/             # Auth, Discovery, Matching, Chat, Calling, Profile, AI...
│       ├── navigation/           # Cấu hình Native Stack & Bottom Tabs
│       ├── services/             # Repository contracts, Supabase & LiveKit adapters, cache
│       └── shared/               # Theme tokens, UI components, domain validators
└── supabase/
    ├── config.toml               # Cấu hình Supabase local
    ├── functions/                # Edge Functions (ai-assistant, livekit-token, call-media-cleanup)
    ├── manual/                   # Script SQL seed dữ liệu mẫu & kiểm tra thủ công
    └── tests/                    # Kiểm thử bảo mật RLS/RPC (pgTAP & PowerShell checks)
```

## Cài đặt & Chạy ứng dụng

### 1. Thiết lập Supabase Database
1. Tạo project mới trên [Supabase Dashboard](https://supabase.com/dashboard).
2. Mở **SQL Editor** và chạy toàn bộ nội dung file [`db/heartsync_schema.sql`](db/heartsync_schema.sql).
3. Trong **Authentication → URL Configuration**, thêm `heartsync://auth/callback` và `heartsync://auth/recovery` vào **Additional Redirect URLs**.
4. *(Tùy chọn)* Chạy các file SQL trong `supabase/manual/` để thêm hồ sơ mẫu cho màn Khám phá.

### 2. Cấu hình biến môi trường & Chạy Mobile App
```powershell
cd heartsync
copy .env.example .env
```
Điền `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vào `heartsync/.env`, sau đó cài đặt thư viện và khởi chạy:

```powershell
npm ci
npx expo start --dev-client
```

> **Lưu ý:** Cần dùng **Expo Development Build** (`npm run android:build`) để chạy đầy đủ deep-link Auth và cuộc gọi thoại/video LiveKit (Expo Go không chứa native WebRTC module).

## Kiểm thử chất lượng

Chạy trong thư mục `heartsync/`:

```powershell
npm run typecheck
npm run lint
npm test -- --ci
```

## Nhóm phát triển

- **Công** — Authentication, Profile, Photos, Preferences/Saved, UI/UX & Database
- **Minh** — Discovery Deck, Filters & Swipe/Match Flow
- **Hảo** — Matches, Realtime Chat, Audio/Video Call & Gemini AI Integration
