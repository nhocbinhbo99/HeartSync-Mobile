# Báo cáo tiến độ HeartSync

Ngày cập nhật: 2026-10-30

Trạng thái tổng thể: **BASE_RELEASED_WITH_BLOCKERS**

Mốc bàn giao: **BASE_READY_FOR_PARALLEL_WORK**

## 1. Tóm tắt

Base project Q00–Q08 đã hoàn thành ở phạm vi code/offline. Ứng dụng đã có Expo SDK 58, navigation shell, Supabase Auth foundation, schema/RLS chuẩn bị sẵn, domain contracts, LiveKit scaffold, test/security audit và tài liệu bàn giao.

Q03 vẫn là **PARTIAL — SQL_PREPARED_NOT_APPLIED** vì Docker Desktop chưa cung cấp engine hoạt động. Supabase CLI đã được cài và khóa phiên bản, nhưng migrations/pgTAP/database lint chưa thể chạy thật. Không có migration, Edge Function hay build nào được đẩy lên remote.

## 2. Tiến độ theo queue

| Chặng | Trạng thái | Kết quả chính |
|---|---|---|
| Q00 | DONE | Audit, đổi `mobile/` thành `heartsync/`, chuẩn hóa Expo SDK 58 |
| Q01 | DONE | React Navigation, theme, shell, accessibility foundation |
| Q02 | DONE | Supabase PKCE Auth, SQLite session, route guard, recovery callback |
| Q03 | PARTIAL | 3 migrations, 14 bảng RLS, 4 RPC, 17 pgTAP cases; chưa chạy PostgreSQL |
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
| Static migration gate | PASS_STATIC_ONLY — 14 RLS tables / 4 RPCs |
| Static LiveKit token gate | PASS_STATIC_ONLY — 7 security patterns |
| Secret scan | PASS — không phát hiện credential/private key |
| npm audit | RISK — 13 low / 3 high / 0 critical; không dùng `--force` |

## 4. Supabase local environment

- Supabase CLI `2.122.0` đã được khóa trong `package-lock.json`.
- Đã tạo `supabase/config.toml` với callback `heartsync://auth/callback`, `heartsync://auth/recovery`, password tối thiểu 8 ký tự và JWT verification cho `livekit-token`.
- Đã có scripts: `db:start`, `db:reset`, `db:test`, `db:lint`, `db:types`.
- Docker Desktop và backend process đang tồn tại, nhưng Docker engine không phản hồi trong 15 giây.
- Log Docker xác định backend crash ở bước khởi tạo Inference manager. Không sử dụng factory reset vì có thể ảnh hưởng dữ liệu Docker ngoài dự án.

## 5. Blockers còn lại

1. Docker Desktop cần tắt **Enable Docker Model Runner** tại **Settings → AI**, sau đó restart và xác minh `docker info`.
2. Chưa chạy `db reset`, 17 pgTAP cases, `db lint` và generate database types.
3. Chưa có development Supabase project/env và kiểm thử email/deep link trên Android thật.
4. Chưa có discovery projection/RPC bảo mật để sinh `age` mà không lộ ngày sinh.
5. Chat adapter/Realtime subscription và tích hợp A/B/C chưa hoàn thiện.
6. LiveKit Edge Function chưa deploy; chưa có EAS development APK và kiểm thử hai máy Android.

## 6. Ba bước tiếp theo

1. Sửa Docker Model Runner, xác minh `docker info`, rồi từ `heartsync/` chạy lần lượt:

   ```powershell
   npm run db:start
   npm run db:reset
   npm run db:test
   npm run db:lint
   npm run db:types
   ```

2. Review kết quả SQL/RLS và generated types trước khi cấu hình development Supabase project.
3. Chia việc theo [`../TEAM_HANDOFF.md`](../TEAM_HANDOFF.md): Công phụ trách auth/profile/database, Minh phụ trách discovery/match, Hảo phụ trách chat/call.

## 7. Git và tài liệu

- Branch `main` đang đi trước `origin/main` 10 commits trước báo cáo này; chưa push hoặc mở PR.
- Commit base gần nhất: `14274de chore(database): add local Supabase CLI config`.
- Các file prompt, `docs/reference/` và deletion `heartsync/.claude/settings.json` là trạng thái có sẵn của người dùng, không được stage/commit.
- Báo cáo chi tiết: [`BASE_PROGRESS.md`](BASE_PROGRESS.md), [`TEST_REPORT.md`](TEST_REPORT.md), [`RUN_LOG.md`](RUN_LOG.md), [`MANUAL_ACTIONS.md`](MANUAL_ACTIONS.md).
