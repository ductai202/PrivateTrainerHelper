# Lộ trình PT Helper

Cập nhật: 2026-10-15. Thứ tự dưới đây là giả thuyết, sẽ đổi sau khi có phản hồi pilot
(xem `docs/superpowers/plans/2026-10-15-phase1-pilot-deploy.md`).

## Trạng thái hiện tại

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Hồ sơ học viên, gói buổi, lịch, checklist sau buổi, gợi ý lấp slot, nhắc lịch thủ công qua Zalo, push | Code xong, test xanh. **Chưa deploy, chưa thử trên máy PT thật** |
| 2 | Link xác nhận/huỷ cho học viên (không cần đăng nhập) | Code xong, test xanh. Chưa dùng thật |
| 3 | Zalo Bot: học viên kết nối bằng mã, bot tự nhắc, trả lời OK/Huỷ | Code xong, test bằng giả lập. **Chưa gọi API Zalo thật**, host/định dạng API lấy từ tài liệu bên thứ ba |

## Giai đoạn 1.1 — Sẵn sàng pilot (trước khi mời PT)

Chặn pilot:
- Tạo tài khoản PT bằng mật khẩu tạm (thay cho mời qua email, hiện không có trang đặt mật khẩu).
- Đổi mật khẩu trong Cài đặt.

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

Điều kiện bắt đầu: pilot cho thấy PT thật sự gửi link và học viên bấm.

Việc có thể làm (chọn theo phản hồi):
- Học viên tự khai giờ rảnh qua link (hiện chỉ PT nhập) → gợi ý lấp slot chính xác hơn.
- Học viên xem số buổi còn lại và lịch sắp tới của mình qua một link cá nhân.
- Hạn dùng và thu hồi link; giới hạn tần suất.
- Học viên đề xuất đổi giờ (thay vì chỉ huỷ), PT duyệt.

**Xong khi:** ≥ 50% buổi được học viên xác nhận qua link trong tuần đo.

## Giai đoạn 3 — Zalo Bot chính thức

Điều kiện bắt đầu: học viên đồng ý nhận tin qua bot; PT mệt vì phải tự gửi từng tin.

Việc cần làm trước khi bật thật:
1. Đọc tài liệu chính thức của Zalo Bot Platform: xác nhận host, định dạng `sendMessage`, cách đăng ký webhook, header bí mật (`ZALO_BOT_API_BASE`, `lib/zalo/botClient.ts`).
2. Tạo bot, đặt `ZALO_BOT_TOKEN` + `ZALO_BOT_WEBHOOK_SECRET`, đăng ký webhook tới `/api/zalo-bot/webhook`.
3. Chống xử lý trùng khi Zalo gửi lại webhook (lưu `update_id`).
4. Thử với 1–2 học viên thật trước; đo tỉ lệ học viên kết nối bot.
5. Rate limit nhập mã kết nối; đưa ra cách ngắt kết nối.

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
