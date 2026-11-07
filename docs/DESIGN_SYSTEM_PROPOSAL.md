# Đề xuất Design System — HeartSync

> **Trạng thái:** ĐỀ XUẤT — chưa thay đổi code, asset, package, token hoặc giao diện đang có.
>
> **Ngày:** 05/11/2026
>
> **Phạm vi:** Android-first, toàn bộ luồng HeartSync; ưu tiên Discovery, Match, Chat và Hồ sơ.
> **Cơ sở:** `DESIGN.md`, `PRODUCT.md`, `docs/TEAM_HANDOFF.md`, quy tắc 19 use case và tham chiếu UX `dating_app.pdf` trong repository.

## 1. Hướng thiết kế

### Ý tưởng chủ đạo: **“Playful chemistry, trustworthy connection”**

HeartSync cần có năng lượng trẻ, dễ nhận ra là một ứng dụng hẹn hò ngay từ lần mở đầu: coral–pink, lavender và những khoảnh khắc chuyển động sống động. Tuy nhiên, nó không nên giống một mạng xã hội đầy thông báo hay sao chép nhận diện của một ứng dụng dating khác. Trải nghiệm mong muốn là:

- **Tin cậy trước, cảm xúc sau:** người dùng phải hiểu rõ mình đang thích, bỏ qua, kết đôi hay trò chuyện với ai; UI không giả lập kết quả hoặc sự hiện diện.
- **Ảnh là nhân vật chính:** ảnh hồ sơ chiếm phần lớn thẻ Discovery; thông tin là các lớp ngắn, dễ quét thay vì một khối văn bản dài.
- **Trẻ, ấm và có chemistry:** coral–pink là màu thương hiệu cho hành động kết nối; lavender tạo nền mềm; gradient chỉ dành cho điểm nhấn có ý nghĩa.
- **Một tay trên Android:** thao tác chính nằm trong vùng ngón cái, mục tiêu chạm tối thiểu 48 dp, Back/keyboard/safe-area vẫn dùng hành vi native.
- **Tôn trọng riêng tư:** không tạo cảm giác theo dõi vị trí, không hiển thị DOB/toạ độ chính xác, trạng thái “Match” chỉ xuất hiện sau phản hồi server.

## 2. Quy tắc nhận diện

| Thành phần | Quy ước đề xuất | Lý do |
|---|---|---|
| Tông chính | Coral–pink | Gợi kết nối, năng lượng và cảm xúc dating; là màu hành động Like/CTA. |
| Tông phụ | Lavender/violet | Tạo chiều sâu trẻ trung cho nền, chip và Match moment mà không quá “kẹo ngọt”. |
| Tông tin cậy | Teal/mint | Dành cho success, quyền đã cấp, cuộc gọi đã kết nối và trạng thái an toàn. |
| Bề mặt | Blush rất nhạt + surface trắng | Làm ảnh và nội dung nổi bật, bớt cảm giác form doanh nghiệp. |
| Hình học | Góc bo rộng ở ảnh/thẻ; bo vừa ở control | Mềm, trẻ, dễ nhận diện nhưng vẫn rõ ràng khi thao tác. |
| Chiều sâu | Border/tone là mặc định; shadow mềm chỉ cho phần tử đang nổi | Card deck có cảm giác vật lý, list vẫn nhẹ và sạch. |
| Ngôn ngữ | Ấm, ngắn, trực tiếp, không hứa hẹn quá mức | Ví dụ: “Bạn đã kết đôi”, không phải “Tình yêu định mệnh!”. |

## 3. Token đề xuất

### 3.1 Màu sắc

Đây là **bảng màu mục tiêu thay thế hệ teal-first hiện tại**, cần được nhóm duyệt trước khi thay đổi `src/shared/theme/tokens.ts`. Nó giữ semantics rõ ràng, không chỉ đổi màu bề mặt.

| Nhóm | Token đề xuất | Giá trị | Dùng cho | Không dùng cho |
|---|---|---:|---|---|
| Brand/action | `primary` | `#F24D6B` | CTA chính, Like, tab đang chọn, lựa chọn đã xác nhận | background phủ toàn trang |
| Brand/pressed | `primaryPressed` | `#D83B58` | pressed state của CTA | body text |
| Brand/soft | `primarySoft` | `#FFE8EE` | chip selected, icon container, vùng Like | trạng thái lỗi |
| Violet | `violet` / `violetSoft` | `#7557E8` / `#F0ECFF` | Match background, prompt, điểm nhấn thứ cấp | destructive action |
| Match | `match` | `#F24D6B` | heart tương hỗ, badge Match, celebration | lỗi, alert chung |
| Match gradient | `matchGradient` | `#F24D6B → #7557E8` | chỉ Match Found, avatar ring đôi, empty-art có chủ đích | button/list/card thông thường |
| Ink | `ink` | `#241B2F` | tên, tiêu đề, nội dung chính | disabled state |
| Muted | `inkMuted` | `#756B7C` | metadata, mô tả phụ | nội dung bắt buộc đọc |
| Success | `success` / `successSoft` | `#16856E` / `#DEF7F0` | đã lưu, quyền đã cấp, cuộc gọi kết nối | Match/Like |
| Warning | `warning` | `#A96700` | yêu cầu cần chú ý, quyền bị hạn chế | lỗi không thể tiếp tục |
| Danger | `danger` | `#C5364D` | block, report, destructive confirmation, error | nút Pass thông thường |
| Surface | `background` / `surface` | `#FFF8FA` / `#FFFFFF` | nền / nội dung | minh hoạ đầy màu |

**Quy tắc màu:** một component không dùng quá một màu ngữ nghĩa ngoài neutral. `matchGradient` là ngoại lệ dành riêng cho khoảnh khắc Match. Mỗi trạng thái có icon hoặc lời giải thích kèm màu; không truyền ý nghĩa chỉ bằng màu.

### 3.2 Chữ và số

**Font đề xuất: `Be Vietnam Pro`** (400, 500, 600, 700), fallback Android system sans-serif. Font có hỗ trợ tiếng Việt tốt, nét đủ thân thiện cho dating app nhưng vẫn đọc rõ ở màn hình nhỏ. Chỉ dùng **một** font family cho giao diện để tránh tải app nặng và mất nhịp khi fallback.

| Vai trò | Kích thước / line height | Weight | Dùng cho |
|---|---:|---:|---|
| Hero | 34 / 42 | 700 | tên trên ảnh Match, heading onboarding; không quá một lần/màn hình |
| Display | 30 / 38 | 700 | tiêu đề màn hình quan trọng |
| Title | 22 / 28 | 700 | tiêu đề section, tên ở danh sách |
| Subtitle | 17 / 24 | 600 | thông tin ưu tiên, tên hành động |
| Body | 16 / 24 | 400 | bio, mô tả, tin nhắn |
| Label | 14 / 20 | 600 | CTA, chip, label field |
| Caption | 13 / 18 | 400/500 | thời gian, metadata, hỗ trợ |

- Giữ minimum 16 sp với nội dung cần đọc; không thu nhỏ `Body` để nhét thêm thông tin vào thẻ.
- Chỉ giới hạn số dòng khi có đường dẫn “Xem thêm” hoặc màn hình chi tiết tương ứng.
- Dùng số dạng tabular cho tuổi, khoảng cách, countdown và thời lượng gọi để chữ số không nhảy ngang.
- Không dùng ALL CAPS cho tiêu đề/CTA tiếng Việt; có dấu sẽ khó đọc và tạo cảm giác gắt.

### 3.3 Khoảng cách, bo góc và chiều sâu

Áp dụng lưới 4 dp; các khoảng dùng thường xuyên: `4, 8, 12, 16, 20, 24, 32, 40`.

| Token | Giá trị | Dùng cho |
|---|---:|---|
| `radius.control` | 16 dp | button, input, chip lớn |
| `radius.card` | 24 dp | card danh sách, panel trạng thái |
| `radius.media` | 28 dp | ảnh profile, deck card, ảnh Match |
| `radius.pill` | 999 dp | tag, badge, avatar indicator |
| `screen.gutter` | 20 dp | cạnh ngang mặc định trên điện thoại |
| `touch.min` | 48 dp | mọi mục có thể chạm |

Border mặc định là 1 dp `border`. Chỉ có ba mức depth: `flat` (không shadow), `raised` (card preview phía sau deck), `floating` (deck card, bottom sheet, menu). Không đặt shadow cho mọi card trong danh sách.

## 4. Hệ icon

### Nền tảng

Tiếp tục dùng `expo-symbols` qua component chung `AppIcon` đã có; Android được lợi từ biểu tượng native nhất quán. Không thêm nhiều thư viện icon hoặc trộn emoji với icon giao diện.

Trước khi code, tạo **bảng alias nghĩa** (ví dụ `navDiscover`, `navSaved`, `navMatches`, `navProfile`, `actionLike`, `actionPass`, `actionMessage`, `actionFilter`, `actionMore`, `safetyBlock`, `safetyReport`) thay vì rải tên symbol ở từng screen. Tên symbol chính xác cần được kiểm tra trên Android Development Build trước khi chốt.

| Ngữ cảnh | Quy ước |
|---|---|
| Bottom tab | 26 dp; outline khi chưa chọn, filled khi đang chọn; luôn có nhãn chữ bên dưới |
| Nút thao tác deck | 24 dp đặt trong nút tròn 56–64 dp; Pass = X, Profile = người, Like = tim |
| Hành động list/chat | 20–24 dp, có `accessibilityLabel`; không chỉ dùng icon cho thao tác rủi ro |
| Badge/status | 16–18 dp; đi cùng text/tooltip nếu ý nghĩa không hiển nhiên |
| Màu icon | dùng `inkMuted` khi inactive, `primary` khi active/Like, `match` chỉ cho trạng thái match hai chiều, `danger` cho block/report |

Không dùng icon vương miện/premium, badge tick xác minh, lightning/boost, ngọn lửa streak hoặc vị trí GPS chính xác vì nằm ngoài scope và có thể tạo kỳ vọng sai.

## 5. Thành phần và mẫu màn hình

### 5.1 Discovery — trung tâm trải nghiệm

**Bố cục:** ảnh chiếm khoảng 62–68% card; gradient tối nhẹ chỉ ở đáy ảnh để giữ độ tương phản; tên + tuổi là điểm dừng mắt đầu tiên. Dưới đó chỉ giữ tối đa hai metadata có ích (ví dụ nghề nghiệp, khu vực công khai) và tối đa ba interest chips.

- `Bio` hiển thị tối đa 2 dòng trong deck; toàn bộ nội dung nằm ở Other Profile.
- Không hiển thị DOB, email, toạ độ chính xác hoặc “khoảng cách” nếu backend chưa trả dữ liệu hợp lệ.
- Có indicator số ảnh nhưng không tự động chạy slideshow; tap vào card mở profile, không gây nhầm với swipe.
- Hàng thao tác cố định: **Bỏ qua → Xem hồ sơ → Thích**. Nút Like lớn hơn hoặc dùng filled coral–pink; Pass chỉ outline/neutral để không bị đọc thành hành động nguy hiểm.
- Filter có icon + badge số bộ lọc đang áp dụng; không dùng badge nếu chưa tính được số đó từ state thật.

**Trạng thái swipe:** kéo phải hiện `THÍCH`, kéo trái hiện `BỎ QUA`; text và hướng đều xuất hiện, không chỉ đổi màu. Thẻ kế tiếp nằm phía sau, offset nhỏ để nói rõ còn người khác. Chỉ loại thẻ sau khi `record_swipe` trả kết quả thành công.

### 5.2 Match Found

Đây là **một khoảnh khắc**, không phải theme toàn app:

- hai avatar kích thước lớn, chồng nhẹ, có heart `match` ở giữa;
- nền `violetSoft` với `matchGradient` tiết chế, hoặc ảnh blur rất nhẹ; một headline ngắn như “Hai bạn đã kết nối!”;
- CTA chính: “Nhắn tin ngay”; CTA phụ: “Tiếp tục khám phá”;
- chỉ mở khi server trả `matchId`, tuyệt đối không minh hoạ success trong lúc request còn pending.

### 5.3 Matches và Chat

- Hàng “Kết nối mới” là avatar tròn ngang với tên ngắn, badge tim tương hỗ và thời điểm thật.
- Hàng hội thoại dùng avatar, tên, preview của tin cuối có thật, thời gian thật và unread badge nếu backend có dữ liệu; không tạo fake presence/fake message.
- Chat bubble ưu tiên dễ đọc: tin mình coral-soft/coral, tin đối phương white + border; trạng thái gửi/lỗi phải có text hoặc icon rõ.
- Empty state nên dùng illustration trừu tượng (hai nét/bong bóng chat), không dùng gương mặt AI hoặc profile giả.

### 5.4 Hồ sơ, filters, saved và safety

- Hồ sơ cá nhân ưu tiên ảnh, prompt/bio, thông tin có thể quản lý; field nhạy cảm cần nhãn riêng tư dễ hiểu.
- Filter dùng control lựa chọn/stepper rõ khoảng giới hạn, hiển thị summary ngắn ở đầu; không để nhiều switch rời rạc.
- Saved là list/grid ảnh nhỏ có tên, tuổi và 1 metadata; không sao chép bộ deck.
- Block/Report nằm trong overflow menu, tách visual khỏi Like/Chat, có confirmation sheet và giải thích hậu quả.

## 6. Motion và phản hồi tương tác

Motion phải làm rõ kết quả hoặc mối quan hệ giữa phần tử, không chạy chỉ để trang trí. Mọi thông số dưới đây là **mục tiêu đề xuất**, cần prototype và test trên Android máy yếu trước khi áp dụng.

| Tình huống | Chuyển động đề xuất | Thời lượng | Điều kiện đúng |
|---|---|---:|---|
| Nhấn button | scale xuống rất nhẹ + đổi màu pressed | 100 ms | phản hồi lập tức, không chặn thao tác |
| Chuyển tab | fade/translate rất ngắn, giữ native navigation | 160–220 ms | không làm mất trạng thái scroll |
| Mở card detail/sheet | fade + translate từ dưới | 220–280 ms | Back đóng đúng phần tử vừa mở |
| Kéo deck | thẻ đi theo ngón tay, xoay tối đa ±6°, badge tăng opacity theo quãng kéo | theo gesture | card chưa bị loại khi chưa có server success |
| Pass/Like thành công | card bay theo hướng, card sau nâng lên | 220–280 ms | sau response thành công, chống bấm lặp |
| Swipe thất bại | card spring về vị trí + error inline/toast có nội dung | 220–320 ms | không xuất hiện Match giả |
| Match confirmed | tim ở giữa scale/fade một lần, avatar nảy rất nhẹ | 420–520 ms | chỉ sau `matchId` đã xác nhận |
| Message gửi | bubble vào vị trí bằng fade 160 ms | 160 ms | optimistic state phải phân biệt được pending/failed |

### Giới hạn motion

- Tôn trọng Android **Reduce motion/Remove animations**: khi bật, thay transform/bounce bằng fade tức thời hoặc không animation.
- Không autoplay carousel, không parallax mạnh, không rung liên tục, không confetti toàn màn hình.
- Không dùng animation để che thời gian tải. Loading dùng skeleton/indicator trung thực và có nhãn screen-reader khi cần.
- Mỗi animation phải dừng/cleanup khi screen unmount; gesture không được chặn Back, TalkBack hoặc thao tác button thay thế.

## 7. Ảnh, minh hoạ và asset

- Ảnh profile là dữ liệu người dùng: luôn có fallback gradient + chữ cái đầu, placeholder mô tả “Chưa có ảnh”, và không hard-code ảnh mẫu trong production.
- Cắt ảnh ưu tiên `cover`, focal point ở khuôn mặt; ảnh có overlay phải còn đọc được tên/tuổi với contrast phù hợp.
- Minh hoạ empty/error dùng hình khối trừu tượng hoặc icon line thương hiệu nhất quán; tối đa 1 minh hoạ/màn hình trạng thái.
- Không sao chép logo, mascot, ảnh stock nhận diện hoặc trade dress của ứng dụng dating tham khảo.
- Tất cả asset phải có quyền sử dụng rõ ràng, kích thước tối ưu Android và alt/accessibility text nếu truyền tải thông tin.

## 8. Accessibility, riêng tư và trạng thái đáng tin

1. Target chạm tối thiểu 48×48 dp; khoảng cách giữa hai action rủi ro đủ tránh chạm nhầm.
2. Chữ đáp ứng font scale Android ít nhất 1.3; tránh text bị cắt trên card/nút khi tên dài.
3. Contrast text/nền đạt tối thiểu 4.5:1 cho body/label; trạng thái không chỉ dựa vào coral/violet/teal/đỏ.
4. Mọi icon button có `accessibilityLabel`; swipe có nút Like/Pass thay thế cho người không dùng gesture.
5. Focus order trên deck: filter → card/chi tiết → Pass → Profile → Like. Không để TalkBack focus vào thẻ preview phía sau.
6. Đối với consent location, permission camera/mic, block/report, unmatch và lỗi mạng: nói rõ **vì sao**, **dữ liệu nào** được dùng và **cách xử lý tiếp theo**.
7. Không dùng chất lượng ảnh, giới tính, ngôn ngữ, khoảng cách hoặc match score để tạo quyết định giải thích mơ hồ; chỉ render trường công khai đã được backend cho phép.

## 9. Quy ước nội dung tiếng Việt

| Tình huống | Nên dùng | Tránh dùng |
|---|---|---|
| Like | “Thích” | “Crush ngay”, “Chốt đơn” |
| Pass | “Bỏ qua” | “Từ chối” (quá nặng) |
| Match | “Hai bạn đã kết nối!” | “Định mệnh đã chọn bạn” |
| Không còn candidate | “Bạn đã xem hết hồ sơ phù hợp lúc này.” | “Hết người rồi!” |
| Lỗi mạng | “Không thể tải dữ liệu. Kiểm tra kết nối rồi thử lại.” | lỗi kỹ thuật/raw provider text |
| Quyền | “Cho phép để dùng khoảng cách gần đúng.” | “Bật GPS ngay” |

## 10. Cách đưa vào sản phẩm sau khi được duyệt

Đây không phải kế hoạch code ngay. Khi cả nhóm phê duyệt, thứ tự an toàn là:

1. Chốt token, font, icon aliases và màu `match` trong một review thiết kế ngắn.
2. Tạo bảng component chung (Button, IconButton, Avatar, ProfileCard, Chip, BottomSheet, Async State) cùng trạng thái default/pressed/disabled/loading/error.
3. Prototype Discovery deck, Match Found và Matches trên **máy Android thật** với font scale 1.3, TalkBack và Reduce motion.
4. Chỉ sau đó mới thay đổi token/component chung rồi từng feature screen; không thay UI lẫn contract Supabase trong một PR.
5. Xác nhận bằng screenshot/video thiết bị và các quality gate hiện có (`typecheck`, `lint`, `test`).

## 11. Các quyết định cần nhóm duyệt

- Chấp thuận `Be Vietnam Pro` hay giữ system font để không tăng asset/package.
- Chấp thuận hệ coral–pink / violet làm nhận diện chính, còn teal/mint chỉ dành cho success và trạng thái tin cậy.
- Chốt phạm vi motion đầu tiên: chỉ deck + Match Found, hay gồm cả chat/sheet.
- Chọn phong cách minh hoạ: chỉ icon/shape tự thiết kế, hay dùng bộ illustration có license rõ ràng.
- Xác nhận nhận diện app (app icon, splash, tên hiển thị) trước khi EAS/Play Store được liên kết lâu dài.

Sau khi các quyết định trên được duyệt, tài liệu này nên được đổi trạng thái thành **APPROVED** và tách thành ticket theo component/feature. Cho đến lúc đó, đây chỉ là định hướng thiết kế; không phải bằng chứng rằng UI hoặc trải nghiệm motion đã được triển khai.
