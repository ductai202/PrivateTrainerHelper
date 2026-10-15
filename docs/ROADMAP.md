# Lộ trình PT Helper

Cập nhật: 2026-10-15. Thứ tự dưới đây là giả thuyết, sẽ đổi sau khi có phản hồi pilot
(xem `docs/superpowers/plans/2026-10-15-phase1-pilot-deploy.md`).

## Trạng thái hiện tại

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Hồ sơ học viên, gói buổi, lịch, checklist sau buổi, gợi ý lấp slot, nhắc lịch thủ công qua Zalo, push | Code xong, test xanh. **Chưa deploy, chưa thử trên máy PT thật** |
| 2 | Cổng học viên: link xác nhận/huỷ theo buổi, link cá nhân (xem số buổi, xin đổi giờ, khai giờ rảnh, chờ slot), thu hồi link, theo dõi huỷ sát giờ | Code xong, 13 e2e + unit xanh. Chưa dùng thật |
| 3 | Zalo Bot: kết nối bằng mã (dùng một lần, giới hạn số lần thử), nhắc 18:00 hôm trước và hỏi lại 2 giờ trước buổi, trả lời OK/Bận, ngắt kết nối, chống xử lý trùng webhook | Code xong, 7 e2e + unit xanh với bot giả lập. **Chưa gọi API Zalo thật**, host/định dạng API lấy từ tài liệu bên thứ ba |

## Giai đoạn 1.1 — Sẵn sàng pilot (trước khi mời PT)

**Cập nhật:** đã thêm xưng hô tự động theo tuổi/giới tính, giờ nhắc mặc định 22:00, admin cố định (`npm run create-admin`), bot trả lời `?`, chống spam, giao diện mới, CI/CD GitHub Actions và `docs/DEPLOY.md`.

**Trạng thái: code xong, test xanh** (92 unit, RLS, 46 e2e). Chưa thử với Zalo/Push/AI thật, xem `docs/TESTING-CREDENTIALS.md`.

Kế hoạch chi tiết (đã duyệt): `docs/superpowers/plans/2026-10-16-phase1.1.md`.

Chặn pilot:
- Tạo tài khoản PT bằng mật khẩu tạm (thay cho mời qua email, hiện không có trang đặt mật khẩu).
- Đổi mật khẩu trong Cài đặt.

Đổi lịch sát giờ (học viên đã xác nhận rồi báo bận qua Zalo cá nhân của PT):
- Push hỏi PT khoảng 90 phút trước mỗi buổi "vẫn tập chứ?".
- "HV báo bận" 1 chạm trên thẻ buổi; "Đổi giờ" trong một bước.
- Checklist sau buổi có thêm "Học viên huỷ" (lưới an toàn khi PT quên). Huỷ không bao giờ trừ buổi.

Chuẩn bị ngày mai (mỗi tối, giờ do từng PT chọn):
- Một màn gồm: buổi hôm nay chưa cập nhật, buổi mai cần nhắc, gợi ý xếp lịch (ai, mấy giờ), gợi ý bài tập (Claude API, PT sửa rồi lưu).

Nên có:
- Mở lại buổi đã huỷ / hoàn tác nhầm trạng thái.
- Sửa và lưu trữ học viên (hiện chỉ sửa mục tiêu/ghi chú/chiều cao).
- Các lỗi nhỏ còn lại trong `docs/superpowers/review-ledger-phase1.md`:
  số điện thoại `+84 0912…`, `invitePt` để lại user mồ côi khi lỗi giữa chừng,
  ràng buộc trùng lịch ở mức DB (hiện chỉ kiểm tra ở ứng dụng, bấm đúp có thể tạo 2 buổi chồng nhau).

**Xong khi:** các mục chặn pilot có e2e xanh; runbook deploy chạy được từ đầu đến cuối.

## Giai đoạn 1.2 — Pilot (1–2 tuần, không code mới ngoài sửa lỗi)

Theo `phase1-pilot-deploy.md`. Đầu ra: danh sách phản hồi có thứ tự ưu tiên + số liệu sử dụng.
Quyết định ở đây quyết định các giai đoạn sau, nên không lên chi tiết trước.

## Giai đoạn 2 — Học viên tự tương tác qua link

**Đã làm** (không chờ pilot): link cá nhân `/s/<token>` (hạn 30 ngày, thu hồi bằng "Tạo link mới"), xin đổi giờ vào slot trống của PT (PT duyệt một chạm), tự khai giờ rảnh, danh sách chờ (được mời trước khi có slot), thu hồi link từng buổi, đếm huỷ sát giờ 30 ngày và dùng để xếp hạng gợi ý lấp slot.

Còn lại, chỉ làm khi pilot cho thấy cần:

- Giới hạn tần suất gửi yêu cầu đổi giờ của một học viên.
- Học viên chọn giờ ngoài khung 06:00–21:00 hoặc ngoài 3 ngày tới.
- Điểm "độ ổn định" hiển thị cho học viên thay vì chỉ PT thấy.

**Xong khi:** ≥ 50% buổi được học viên xác nhận qua link trong tuần đo.

## Giai đoạn 3 — Zalo Bot chính thức

**Đã làm trong code** (kiểm thử với bot giả lập): chống xử lý trùng theo `update_id`, giới hạn 5 lần nhập mã/10 phút/chat, mã kết nối dùng một lần, ngắt kết nối bằng "stop", nhận "Bận" (chỉ khi có dấu, để không nhầm với "bạn"), và bot hỏi lại học viên 2 giờ trước buổi. Trả lời luôn áp dụng cho đúng buổi vừa được hỏi.

Việc còn lại trước khi bật thật (cần tài khoản Zalo của bạn):
1. Đọc tài liệu chính thức của Zalo Bot Platform: xác nhận host, định dạng `sendMessage`, cách đăng ký webhook, header bí mật (`ZALO_BOT_API_BASE`, `lib/zalo/botClient.ts`). Có sẵn `node scripts/zalo-bot.mjs check` và `set-webhook` để thử nhanh.
2. Tạo bot, đặt `ZALO_BOT_TOKEN` + `ZALO_BOT_WEBHOOK_SECRET`, đăng ký webhook tới `/api/zalo-bot/webhook`.
3. Thử với 1–2 học viên thật trước; đo tỉ lệ học viên kết nối bot.

Phương án thay thế/bổ sung nếu học viên không chịu nhắn bot: ZNS (tin template theo số điện thoại, ~250–360đ/tin, cần duyệt template và OA đã xác thực). Chỉ cân nhắc khi gym chấp nhận trả phí.

**Xong khi:** nhắc lịch tự gửi cho ≥ 70% học viên đang tập mà PT không phải thao tác tay.

## Ý tưởng chưa xếp lịch (cần bằng chứng từ pilot)

- Thư viện bài tập / mẫu giáo án để PT dán nhanh thay vì gõ lại.
- Theo dõi gia hạn gói và doanh thu theo PT/tháng; nhắc học viên sắp hết gói.
- Xuất báo cáo (PDF/Excel) tiến độ của một học viên để gửi cho học viên.
- Đa chi nhánh / bán cho gym khác (SaaS): đăng ký gym tự phục vụ, thanh toán, phân quyền chi nhánh. Lược đồ đã có `gym_id` ở mọi bảng nên không phải đổi nền tảng, nhưng cần màn onboarding, billing và quy trình hỗ trợ.
- Dùng offline khi mạng yếu trong phòng tập (cache lịch ngày).
- Ảnh trước/sau cạnh nhau trong tab Tiến độ.

## Việc kỹ thuật nền (làm khi có thời gian, không phụ thuộc pilot)

- CI chạy unit + pgTAP + e2e trên mỗi PR.
- Theo dõi lỗi production (Sentry hoặc tương đương) và log cho `/api/cron/tick`.
- Lịch sao lưu và thử khôi phục.
- Dọn dữ liệu e2e: các test hiện xoá buổi tạo trong 24 giờ gần nhất, chỉ chạy trên DB local.
