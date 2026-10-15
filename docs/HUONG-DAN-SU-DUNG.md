# Hướng dẫn sử dụng

Tên "Học viên A1", "PT An" chỉ có trong **dữ liệu demo** ở máy dev (file `supabase/seed.sql`). Khi dùng thật, PT tự nhập học viên của mình.

## Ai làm gì, một lần duy nhất

### Chủ gym (làm một lần)
1. Đăng nhập → **Quản lý → Tạo tài khoản PT**: nhập tên và email PT, app sinh mật khẩu tạm. Gửi mật khẩu cho PT.
2. (Nếu dùng Zalo Bot) tạo bot một lần trên Zalo Bot Platform, đặt token và webhook theo `docs/TESTING-CREDENTIALS.md`.

### Mỗi PT (làm một lần)
1. Đăng nhập bằng mật khẩu tạm → **Cài đặt → Đổi mật khẩu**.
2. **Cài đặt → Nhận thông báo qua Zalo**: mở Zalo, chat với bot của phòng tập, nhắn đúng mã 6 ký tự hiện trong app. Từ đây mọi báo cáo của học viên (xác nhận, huỷ, xin đổi giờ, "vẫn tập chứ?") đến thẳng Zalo của PT. Cách này chạy tốt cả trên iPhone.
3. (Tuỳ chọn) Thêm app vào màn hình chính và bật **thông báo đẩy**. iPhone cần iOS 16.4 trở lên.
4. **Cài đặt → Nhắc buổi tối**: chọn giờ muốn app nhắc chuẩn bị ngày mai (mặc định 20:00).

## Với mỗi học viên mới

### PT làm (khoảng 2 phút)
1. **Học viên → Thêm**: tên, số điện thoại (Zalo), năm sinh, giới tính, chiều cao, số đo, mục tiêu, chấn thương/ghi chú, meal prep hiện tại.
2. Nhập **số buổi trong gói** và **số buổi mong muốn mỗi tuần**.
3. Nhập **giờ rảnh** thông thường của học viên (có thể để học viên tự sửa sau, xem dưới).
4. Mở hồ sơ học viên, bấm **Gửi link qua Zalo** (link cá nhân). App mở sẵn cuộc chat Zalo với nội dung đã soạn.
5. Hồ sơ cũng hiện **mã kết nối bot** (6 ký tự): bảo học viên nhắn mã này cho bot nếu muốn nhận nhắc lịch tự động.

### Học viên làm (một lần, khoảng 1 phút, không cần cài gì)
1. **Mở link cá nhân** PT gửi (hoạt động trên trình duyệt điện thoại, không cần tài khoản). Tại đây học viên có thể:
   - xem số buổi còn lại và các buổi sắp tới,
   - **khai giờ rảnh** của mình (PT dựa vào đây để xếp lịch và mời lấp slot),
   - bấm **"Muốn tập thêm"** để vào danh sách chờ (được mời trước khi có chỗ trống),
   - **xin đổi giờ** một buổi sang giờ trống của PT.
2. (Tuỳ chọn, nhưng nên làm) **Nhắn mã kết nối cho bot** trên Zalo. Sau đó học viên nhận nhắc lịch từ bot và chỉ cần trả lời:
   - **OK** để xác nhận,
   - **Bận** (có dấu) để báo không tập được,
   - **stop** để ngắt kết nối.

Học viên **không** bắt buộc làm bước 2: PT vẫn nhắc bằng nút "Nhắc qua Zalo" (tin có kèm link xác nhận/huỷ).

## PT làm hằng ngày

| Lúc nào | Việc | Ở đâu |
|---|---|---|
| Sáng | Xem lịch hôm nay | **Hôm nay** |
| Tối (đúng giờ đã chọn) | Nhận nhắc, mở **Chuẩn bị ngày mai**: cập nhật buổi hôm nay còn sót, nhắn học viên lịch mai, đặt thêm buổi theo gợi ý, soạn bài tập bằng AI | **Chuẩn bị ngày mai** |
| Trước mỗi buổi ~90 phút | App hỏi "vẫn tập chứ?". Bấm **Vẫn tập** hoặc **Học viên báo bận** | Thông báo (Zalo/đẩy) |
| Học viên nhắn bận | Bấm **HV bận / HV ốm** trên thẻ buổi, hoặc **Đổi giờ**. App gợi ý ngay ai có thể vào lấp slot | Thẻ buổi / chi tiết buổi |
| Sau buổi | Tick **Hoàn thành**, **Đã ký**, ghi bài tập (hoặc "Không cần") | Chi tiết buổi |
| Định kỳ | Bấm **Cập nhật tình trạng** (số đo mới, nhận xét, ảnh) | Hồ sơ học viên → Tiến độ |

### Khi học viên đổi ý sát giờ
- **Học viên báo qua bot hoặc link:** app tự cập nhật buổi và báo PT (Zalo, và push nếu đã bật). PT chỉ việc xem gợi ý lấp slot.
- **Học viên nhắn riêng cho PT trên Zalo cá nhân:** app không đọc được tin này. PT bấm **HV bận** một chạm. Nếu PT quên: buổi hiện "Chưa xong" ở màn Hôm nay, bị nhắc lại cuối ngày, và vẫn nằm trong **Buổi chưa cập nhật** ở màn chuẩn bị tối. Quên cập nhật **không làm sai số buổi** vì chỉ buổi hoàn thành và đã ký mới trừ gói.
- **Học viên xin đổi giờ qua link:** PT nhận thông báo, mở buổi, bấm **Đồng ý đổi giờ** hoặc **Từ chối**.

## Quy tắc cần nhớ

- Huỷ lúc nào cũng **không trừ buổi**. App chỉ ghi lại để đếm "huỷ sát giờ" (dưới 4 giờ, trong 30 ngày) và ưu tiên người ổn định khi gợi ý lấp slot.
- Chỉ buổi **hoàn thành và đã ký** mới trừ vào gói.
- Link cá nhân hết hạn sau 30 ngày; PT bấm **Tạo link mới** để vô hiệu hoá link cũ. Link từng buổi có nút **Thu hồi link buổi**.
- Mã kết nối bot dùng **một lần**; mỗi chat chỉ được nhập sai tối đa 5 lần trong 10 phút.
- Gợi ý bài tập của AI chỉ là **bản nháp**, PT luôn xem và sửa trước khi lưu. App chỉ gửi tên gọi, mục tiêu, chấn thương, số đo và bài tập gần đây (không gửi số điện thoại hay họ tên đầy đủ).
