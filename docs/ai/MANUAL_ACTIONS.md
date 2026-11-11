# Thao tác thủ công — Gemini AI

## Chưa làm ở A00

Không có remote Supabase, Gemini, billing, key hay Git remote nào đã bị thay đổi.

## Khi code hoàn tất (không dán secret vào chat/Git)

1. Tạo/review key tại Google AI Studio cho đúng Gemini project Free Tier của nhóm. Xác nhận model `gemini-3.5-flash-lite` khả dụng cho project đó và xem rate limits hiện hành; không bật billing nếu không có quyết định riêng của nhóm.
2. Trong Supabase Dashboard của project đúng: **Edge Function Secrets** → thêm `GEMINI_API_KEY`; tuỳ chọn thêm `GEMINI_MODEL=gemini-3.5-flash-lite`. Không thêm các giá trị này vào `heartsync/.env`, `EXPO_PUBLIC_*`, `app.json`, `eas.json` hoặc Git.
3. Review migration, sau đó tự chạy `supabase link` và apply migration theo quy trình môi trường của nhóm. Codex không tự chạy các lệnh remote này.
4. Review source Function, sau đó tự deploy `ai-assistant`. Sau deploy xác nhận Function vẫn yêu cầu user JWT (`verify_jwt` không tắt).
5. Thử với hai tài khoản thật: Bio hai lần lifetime + lần ba bị chặn; Icebreaker hai lần trong cùng ngày VN + lần ba bị chặn; unmatch/block trước request bị từ chối; chọn câu không tự gửi message.
6. Nếu key lộ: revoke/delete key tại Google AI Studio ngay, tạo key mới, thay Supabase Secret, redeploy/restart Function theo Dashboard và rà soát Git/log/CI để xoá secret.

## Khắc phục Icebreaker 403 sau khi đã tự áp dụng migration

Kết quả kiểm tra Match/JWT của owner đã xác nhận Match mới hợp lệ. Không chạy lại `db push --remote` — remote có lịch sử migration khác local. Trong **Supabase SQL Editor** của đúng project, chạy đúng một lần:

```sql
notify pgrst, 'reload schema';
```

Lệnh này chỉ yêu cầu PostgREST nạp lại danh sách RPC; không sửa bảng, Match, quota hay user. Sau đó force-close/mở lại app, vào đúng chat giữa hai tài khoản test và thử Icebreaker.

Nếu vẫn lỗi, owner tự deploy source Function mới đã có trong repository (không dùng `--no-verify-jwt`):

```powershell
npx supabase functions deploy ai-assistant
```

Thử lại một lần với request mới. Trong **Edge Functions → ai-assistant → Logs**, tìm dòng JSON `ai_assistant_failure` và chỉ gửi các trường `phase`, `result_class`, `error_code`, `request_id` (và `constraint` nếu có). Log này đã được thiết kế không chứa Gemini key, JWT, ID người dùng/Match, profile, prompt hay nội dung Gemini.

## Icebreaker `reserve_quota / 23514` — đã sửa production

Log production đã xác nhận đây là constraint sai regex trong migration AI đầu tiên; Gemini chưa từng được gọi. Repair đã được áp dụng trực tiếp lên production ngày 11/11/2026 sau khi owner cấp quyền. Không chạy lại migration cũ và **không chạy `db push --remote`**. Nếu cần audit, migration repair là:

```sql
alter table public.ai_quota_buckets
  drop constraint if exists ai_quota_buckets_period_key_check;

alter table public.ai_quota_buckets
  add constraint ai_quota_buckets_period_key_check check (
    period_key = 'lifetime' or period_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  );

alter table private.ai_generation_requests
  drop constraint if exists ai_generation_request_shape;

alter table private.ai_generation_requests
  add constraint ai_generation_request_shape check (
    (feature = 'profile_bio' and period_key = 'lifetime' and match_id is null)
    or (feature = 'icebreaker' and period_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and match_id is not null)
  );

notify pgrst, 'reload schema';
```

Đây là thay đổi schema có chủ đích: chỉ thay constraint bị lỗi; không xóa hay chỉnh sửa Match, user, message hoặc quota rows. Function mới nhất cũng đã deploy. Force-close/mở lại app rồi thử một Icebreaker với request mới; expected outcome là đúng ba gợi ý.

Nếu retest vẫn trả `reserve_quota / 23514` dù query constraint đã có `[0-9]`, deploy source Function mới nhất rồi test đúng một lần:

```powershell
cd C:\dev\HeartSync-Mobile
npx supabase functions deploy ai-assistant
```

Chỉ gửi dòng `ai_assistant_failure` đã rút gọn, gồm `phase`, `result_class`, `error_code`, `constraint` (nếu có) và `request_id`. Không dán log request thô vì nó có thể chứa IP, session metadata hoặc các identifier không cần cho việc chẩn đoán.

Nếu một `POST 503` chỉ có `booted` mà không có event Function, deploy source mới nhất (có safe fallback) rồi thử lại. Khi đó log sẽ có `UNHANDLED_REQUEST_ERROR` thay vì mất dấu exception. Không gửi raw request log.

### Probe không lưu dữ liệu khi vẫn gặp `23514`

Nếu cần xác định chính xác check constraint còn lỗi, owner có thể chạy probe sau trong SQL Editor. Thay `<ACTOR_USER_UUID>` và `<ACTIVE_MATCH_UUID>` bằng hai UUID của chính user và Match vừa kiểm tra. Lệnh luôn `ROLLBACK`, nên không giữ request/quota row nào:

```sql
begin;
select set_config('request.jwt.claim.sub', '<ACTOR_USER_UUID>', true);

do $$
declare
  v_constraint text;
  v_sqlstate text;
begin
  perform public.reserve_ai_request(
    'icebreaker',
    'd3d6132d-c45d-4e21-8224-5f2f64ccfe83'::uuid,
    '<ACTIVE_MATCH_UUID>'::uuid
  );
  perform set_config('app.ai_reserve_probe', 'RESERVE_SUCCEEDED', true);
exception
  when check_violation then
    get stacked diagnostics v_constraint = constraint_name;
    perform set_config('app.ai_reserve_probe', 'CHECK:' || coalesce(v_constraint, 'UNKNOWN'), true);
  when others then
    get stacked diagnostics v_sqlstate = returned_sqlstate;
    perform set_config('app.ai_reserve_probe', 'SQLSTATE:' || coalesce(v_sqlstate, 'UNKNOWN'), true);
end
$$;

select current_setting('app.ai_reserve_probe', true) as probe_result;
rollback;
```

Chỉ gửi giá trị `probe_result`; không gửi metadata request, header hay session log.

## Thứ tự release bắt buộc

1. **Hoàn tất local verification còn lại.** Deno Gemini unit đã PASS qua `npx deno`; Docker Desktop daemon vẫn không phản hồi. Khi Docker hoạt động, từ `heartsync/` chạy `npm run db:reset`, rồi tại repo root chạy `supabase test db` để thực thi `supabase/tests/ai_quota.sql`. Không thay local test bằng remote production.
2. **Tạo Gemini key Free Tier.** Vào Google AI Studio bằng tài khoản quản lý project của nhóm, tạo/review key cho đúng project; chọn/kiểm tra `gemini-3.5-flash-lite`, structured output và rate limits hiện hành. Xác nhận tier Free trước khi tiếp tục. Không dán key vào chat, screenshot, issue, commit hay `.env` Expo.
3. **Lưu secret server-side.** Supabase Dashboard → project đúng → Edge Function Secrets: thêm `GEMINI_API_KEY`; tuỳ chọn `GEMINI_MODEL=gemini-3.5-flash-lite`. Đảm bảo `GEMINI_API_KEY` không nằm trong `EXPO_PUBLIC_*`, `heartsync/.env`, `app.json`, `eas.json`, AndroidManifest hay source app.
4. **Review migration trước.** Owner tự kiểm tra `20261111110000_heartsync_ai_quota.sql`, nhất là RLS/grants, `Asia/Ho_Chi_Minh` và helper active Match. Chỉ sau khi duyệt, owner mới chạy `supabase link`/migration apply theo quy trình project. Codex không làm thay.
5. **Review/deploy Function sau.** Owner tự deploy `ai-assistant` sau khi migration thành công. Giữ `[functions.ai-assistant] verify_jwt = true`; không dùng `--no-verify-jwt`. Test `get_quota` bằng session user hợp lệ và kiểm tra error 401 khi thiếu session.
6. **Smoke test hai tài khoản Android.** Test 2 Bio thành công rồi Bio thứ ba bị chặn cả sau logout/login; 2 Icebreaker mỗi ngày VN, từng lượt đúng 3 câu; chạm Chọn chỉ điền composer; gửi chỉ khi người dùng chạm Gửi. Test unmatch/block trước và trong generation, 429/503, retry request ID, 23:59→00:00 VN và 3 request đồng thời.
7. **Incident response.** Nếu key leak, revoke tại Google AI Studio trước, tạo key mới, thay Edge Function Secret, redeploy/restart Function, kiểm tra Git history/CI/logs và xoá secret. Đánh giá quota/project activity trước khi mở lại feature.

## Deploy validator correction (current blocker)

Source đã có fix cho `gemini_generation / AI_OUTPUT_INVALID` và Deno 5/5 PASS, nhưng CLI session của Codex không còn access token. Từ terminal đã đăng nhập Supabase của owner, chạy:

```powershell
cd C:\dev\HeartSync-Mobile
npx supabase login
npx supabase functions deploy ai-assistant
```

Sau đó force-close app và thử Icebreaker lại. Không tạo Gemini key mới, không chạy `db push --remote`, và không dán access token vào chat.
