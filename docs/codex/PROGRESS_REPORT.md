# Báo cáo tiến độ HeartSync

Ngày cập nhật: 2026-10-30

Trạng thái tổng thể: **BASE_RELEASED_WITH_BLOCKERS**

Mốc bàn giao: **BASE_READY_FOR_PARALLEL_WORK**

## 1. Tóm tắt

Base project Q00–Q08 đã hoàn thành ở phạm vi code/offline. Ứng dụng đã có Expo SDK 58, navigation shell, Supabase Auth foundation, schema/RLS chuẩn bị sẵn, domain contracts, LiveKit scaffold, test/security audit và tài liệu bàn giao.

Q03 là **PARTIAL — CLOUD_APPLIED_MANUAL_VALIDATION**. Ba migration đã được áp thủ công theo đúng thứ tự lên dedicated development project `heartsync-dev`; truy vấn xác minh dashboard trả về 14 bảng public, 14 bảng bật RLS, 1 bucket profile-photo private và 4 policy Storage. pgTAP/database lint/generate types local chưa chạy vì Docker Desktop vẫn không dùng được; Edge Function và LiveKit chưa deploy.

## 2. Tiến độ theo queue

| Chặng | Trạng thái | Kết quả chính |
|---|---|---|
| Q00 | DONE | Audit, đổi `mobile/` thành `heartsync/`, chuẩn hóa Expo SDK 58 |
| Q01 | DONE | React Navigation, theme, shell, accessibility foundation |
| Q02 | DONE | Supabase PKCE Auth, SQLite session, route guard, recovery callback |
| Q03 | PARTIAL — CLOUD_APPLIED_MANUAL_VALIDATION | 3 migrations đã áp remote; 14 bảng RLS, bucket private + 4 Storage policy được dashboard xác minh; 17 pgTAP cases chưa chạy |
| Q04 | DONE | Domain types, 6 repository/gateway interfaces, safe error mapping |
| Q05 | DONE | README, setup manual, team handoff; sẵn sàng làm UI song song |
| Q06 | SCAFFOLD_ONLY | LiveKit packages/plugin, EAS profiles, gateway, token Edge Function template |
| Q07 | DONE | Quality/security audit, secret scan, SRS/SDS delta |
| Q08 | DONE | Release notes, final handoff, artifact/link validation |

Chi tiết checkpoint: [`QUEUE_STATUS.md`](QUEUE_STATUS.md).

## 3. Kiểm thử đã chạy

| Kiểm tra | Kết quả |
|---|---|
| `npm ci` | PASS — 1.349 packages từ lockfile |
| TypeScript | PASS |
| ESLint | PASS |
| Jest | PASS — 14 suites / 53 tests |
| Expo Doctor | PASS — 20/20 |
| Android Expo prebuild | PASS |
| Android Hermes export | PASS — 1.258 modules / 5 MB |
| Android Expo export với cloud `.env` | PASS — 1.258 modules / 5 MB |
| Supabase cloud SQL verification | PASS_MANUAL — 14 public tables / 14 RLS / 1 private bucket / 4 Storage policy |
| Static migration gate | PASS_STATIC_ONLY — 14 RLS tables / 4 RPCs |
| Static LiveKit token gate | PASS_STATIC_ONLY — 7 security patterns |
| Secret scan | PASS — không phát hiện credential/private key |
| npm audit | RISK — 13 low / 3 high / 0 critical; không dùng `--force` |

## 4. Supabase environments

- Supabase CLI `2.122.0` đã được khóa trong `package-lock.json`.
- Đã tạo `supabase/config.toml` với callback `heartsync://auth/callback`, `heartsync://auth/recovery`, password tối thiểu 8 ký tự và JWT verification cho `livekit-token`.
- Đã có scripts: `db:start`, `db:reset`, `db:test`, `db:lint`, `db:types`.
- Development project `heartsync-dev` đã được tạo trên Supabase cloud. Local `.env` có URL và publishable key; không ghi hoặc commit secret/service-role key.
- Ba migration đã được áp thủ công vào cloud và kết quả dashboard đã được xác minh.
- Docker local engine vẫn không dùng được; đây không còn chặn cloud development, nhưng vẫn chặn pgTAP/lint/type generation local.

## 5. Blockers còn lại

1. Chưa chạy 17 pgTAP cases, `db lint` và generate database types.
2. Chưa kiểm thử email/deep link trên Android development build thật.
4. Chưa có discovery projection/RPC bảo mật để sinh `age` mà không lộ ngày sinh.
5. Chat adapter/Realtime subscription và tích hợp A/B/C chưa hoàn thiện.
6. LiveKit Edge Function chưa deploy; chưa có EAS development APK và kiểm thử hai máy Android.

## 6. Ba bước tiếp theo

1. Không cần Docker để tiếp tục mobile/cloud development. Chạy Metro và kiểm thử đăng ký/đăng nhập với `heartsync-dev` trên Android development build:

   ```powershell
   cd heartsync
   npx expo start --dev-client
   ```

2. Khi Docker được sửa hoặc có CI PostgreSQL, chạy `db reset`, 17 pgTAP cases, `db lint` và generate/review database types.
3. Chia việc theo [`../TEAM_HANDOFF.md`](../TEAM_HANDOFF.md): Công phụ trách auth/profile/database, Minh phụ trách discovery/match, Hảo phụ trách chat/call.

## 7. Git và tài liệu

- Branch `main` đang đi trước `origin/main`; chưa push hoặc mở PR.
- Commit base gần nhất: `14274de chore(database): add local Supabase CLI config`.
- Các file prompt, `docs/reference/` và deletion `heartsync/.claude/settings.json` là trạng thái có sẵn của người dùng, không được stage/commit.
- Báo cáo chi tiết: [`BASE_PROGRESS.md`](BASE_PROGRESS.md), [`TEST_REPORT.md`](TEST_REPORT.md), [`RUN_LOG.md`](RUN_LOG.md), [`MANUAL_ACTIONS.md`](MANUAL_ACTIONS.md).
