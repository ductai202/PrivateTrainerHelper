# App xếp lịch PT gym private + Zalo — Thiết kế

## Bối cảnh
1 trung tâm gym private, 5–6 PT, mỗi PT ~15 học viên/đợt. Học viên lịch flexible, PT xếp lịch hằng ngày nhưng hay quên, học viên huỷ đột xuất → PT phải lấp slot. Kênh liên lạc chính: Zalo.
Đau cả 4 khâu: nhắc lịch, lấp slot huỷ, theo dõi số buổi còn lại, xếp lịch ngày.
Mục tiêu: làm vừa đủ cho 1 gym, nhưng thiết kế mở rộng được (nhiều gym/chi nhánh sau này).
Chưa rõ học viên có chịu bấm link/bot → **PT là người dùng chính**, link/bot cho học viên là tuỳ chọn.

## Kết luận nghiên cứu Zalo (cần đối chiếu lại developers.zalo.me)
| Kênh | Ban? | Chi phí | Hạn chế |
|---|---|---|---|
| Zalo Bot Platform | Không (chính thức) | Có vẻ free | Học viên phải nhắn bot trước |
| ZNS/ZBS template | Không | ~250–360đ/tin | Template duyệt, ≤400 ký tự, 6h–22h |
| OA tin tư vấn | Không | Gói OA trả phí | Cửa sổ 48h |
| zca-js (Zalo cá nhân) | **Có rủi ro** | Free | Không dùng |

## Hướng đã chọn: Web app (PWA) cho PT + Zalo theo từng bước
- **Hình thức:** Web app, KHÔNG làm mobile app native. Thiết kế mobile-first (PT thao tác chủ yếu trên điện thoại: nút to, thao tác 1 tay, bottom nav), vẫn dùng được trên laptop. Là PWA: PT mở link → "Thêm vào màn hình chính" → có icon như app, không qua App Store/CH Play. Lưu ý: push notification trên iPhone chỉ chạy khi đã thêm vào màn hình chính (iOS 16.4+) → hướng dẫn PT làm bước này lúc onboard.
- **Stack:** Next.js (App Router, TypeScript) + Supabase (Postgres, Auth, Row Level Security) + deploy Vercel. Cron qua Vercel Cron / Supabase pg_cron.
- **Scalable:** mọi bảng có `gym_id`; RLS lọc theo gym + vai trò → thêm gym/chi nhánh không phải đổi schema.

### Data model
- `gyms`, `members` (user ↔ gym, role: `owner` | `pt`)
- `students` (gym_id, pt_id, tên, SĐT, năm sinh/tuổi, giới tính, chiều cao, mục tiêu, tiền sử chấn thương/ghi chú, zalo_bot_chat_id nullable)
- `body_measurements` (student_id, ngày đo, cân nặng, vòng ngực/eo/mông/đùi/bắp tay, % mỡ nullable, ghi chú) — mỗi lần PT cập nhật là 1 bản ghi mới → xem được tiến độ theo thời gian
- `progress_notes` (student_id, ngày, tình trạng/nhận xét của PT, ảnh nullable)
- `meal_plans` (student_id, hiệu lực từ ngày, mục tiêu calo/macro, nội dung thực đơn/meal prep, ghi chú) — giữ lịch sử phiên bản
- `workout_plans` (session_id hoặc student_id + ngày, nội dung bài tập) — giáo án cho buổi
- `packages` (student_id, tổng buổi, ngày bắt đầu/hết hạn) → số buổi còn lại = tổng − buổi `done`/`no_show` tính phí
- `student_availability` (student_id, thứ, giờ từ–đến) — khung giờ học viên hay rảnh
- `sessions` (gym_id, pt_id, student_id, start_at, end_at, status: `scheduled|confirmed|cancelled|done|no_show`, cancel_reason, `student_signed` bool, `signed_at`, `workout_logged` bool)
- `message_log` (session_id, kênh: `manual|bot|zns`, nội dung, thời điểm)

### Màn hình PT (mobile-first)
1. **Hôm nay / Tuần:** timeline slot, màu theo trạng thái; kéo-thả hoặc bấm để đặt buổi; cảnh báo trùng giờ.
2. **Học viên:** danh sách + số buổi còn lại, sắp hết gói, khung giờ rảnh.
3. **Huỷ buổi → Lấp slot:** khi đánh dấu huỷ, app gợi ý học viên cùng PT có: còn buổi, khung rảnh phủ slot đó, chưa có lịch hôm đó, ít buổi tuần này nhất → nút "Mời qua Zalo".
4. **Nhắc lịch:** tối hôm trước app tạo danh sách tin nhắc cho lịch ngày mai; mỗi tin có nút copy + mở Zalo (`https://zalo.me/<SĐT>`). PT nhận thông báo đẩy (PWA push) "Bạn có N buổi mai, chưa nhắc".
5. **Sau mỗi buổi (checklist):** khi qua `end_at` của buổi, app gửi push cho PT kèm checklist: ☐ Học viên đã ký buổi này chưa ☐ Đã ghi bài tập hôm nay cho học viên chưa (nếu cần) ☐ Đánh dấu Hoàn thành / Vắng. Buổi còn mục chưa tick hiện badge "Chưa xong" ở màn Hôm nay; nhắc lại cuối ngày (vd 21h) nếu vẫn thiếu. Chỉ buổi `done` + đã ký mới trừ vào gói.
6. **Hồ sơ học viên:** form nhập ban đầu (tên, tuổi, giới tính, chiều cao, số đo các vòng, mục tiêu, chấn thương/ghi chú) + meal prep hiện tại. Tab **Tiến độ**: PT bấm "Cập nhật tình trạng" → thêm số đo mới / nhận xét / ảnh; biểu đồ cân nặng & số đo theo thời gian. Tab **Dinh dưỡng**: meal plan hiện hành + lịch sử. Tab **Bài tập**: bài tập đã ghi theo từng buổi.
7. **Chủ gym:** xem lịch tất cả PT, báo cáo buổi dạy/tháng, buổi chưa ký.

### Lộ trình
- **Giai đoạn 1 (MVP):** auth PT/owner, hồ sơ học viên (thông tin cơ bản, số đo, mục tiêu, meal prep) + cập nhật tình trạng/tiến độ, gói buổi, lịch ngày/tuần, checklist sau buổi (đã ký / đã ghi bài tập) + push nhắc PT, huỷ + gợi ý lấp slot, tin nhắn soạn sẵn mở Zalo thủ công. Không gọi API Zalo.
- **Giai đoạn 2:** link xác nhận/huỷ cho học viên (token ký, không cần đăng nhập) → cập nhật trạng thái tự động, báo PT.
- **Giai đoạn 3:** Zalo Bot — học viên kết nối bot 1 lần (QR/link với mã), sau đó bot tự nhắc lịch, nhận "OK/Huỷ". Webhook HTTPS kiểm `X-Bot-Api-Secret-Token`. Học viên không kết nối bot vẫn dùng luồng thủ công.
- **Tuỳ chọn:** ZNS cho nhắc lịch theo SĐT nếu gym chịu trả phí.

### Xử lý lỗi / biên
- Trùng lịch PT hoặc học viên → chặn khi tạo.
- Gói hết buổi / hết hạn → cảnh báo, vẫn cho đặt (PT quyết).
- Múi giờ cố định Asia/Ho_Chi_Minh.
- Bot gửi lỗi → ghi `message_log`, fallback về nút gửi thủ công.

## Các file chính (dự án mới)
- `supabase/migrations/*.sql` — schema + RLS
- `app/(pt)/today`, `app/(pt)/week`, `app/(pt)/students`, `app/(owner)/overview`
- `lib/scheduling/suggestFillIns.ts` — thuật toán gợi ý lấp slot (thuần, dễ test)
- `lib/messages/templates.ts` — mẫu tin nhắc/mời
- `app/(pt)/students/[id]` (tabs Hồ sơ / Tiến độ / Dinh dưỡng / Bài tập)
- `lib/sessions/postSessionChecklist.ts` + cron job quét buổi đã kết thúc chưa hoàn tất checklist → gửi Web Push
- (GĐ3) `app/api/zalo-bot/webhook/route.ts`, `lib/zalo/botClient.ts`

## Kiểm thử
- Unit test (Vitest): `suggestFillIns`, tính buổi còn lại (chỉ trừ buổi done + đã ký), phát hiện trùng lịch, chọn buổi cần nhắc checklist.
- E2E (Playwright) trên localhost với seed data: tạo học viên → đặt lịch → huỷ → thấy gợi ý → tạo tin nhắn.
- Thử trên điện thoại thật: cài PWA, mở link Zalo.
- GĐ3: test bot bằng tài khoản Zalo phụ + long polling `getUpdates` trước khi bật webhook.

## Bước tiếp theo
Duyệt thiết kế này → chọn thư mục dự án → lập implementation plan chi tiết cho Giai đoạn 1.
