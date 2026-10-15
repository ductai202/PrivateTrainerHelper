# Triển khai Giai đoạn 1 để PT dùng thử (pilot)

> Đây là kế hoạch + runbook. Chưa có gì được deploy. Người thực hiện: chủ dự án (Tài).

**Mục tiêu:** đưa Giai đoạn 1 lên một URL thật để 5–6 PT của trung tâm dùng thử ~1–2 tuần, thu phản hồi để quyết định làm tiếp gì.

**Phạm vi pilot:** chỉ dùng tính năng Giai đoạn 1 (hồ sơ học viên, lịch, checklist sau buổi, huỷ → gợi ý lấp slot, nhắc lịch thủ công qua Zalo cá nhân của PT, push thông báo). Giai đoạn 2 (link xác nhận cho học viên) đã có trong code và tự bật cùng lúc, không cần cấu hình thêm. Giai đoạn 3 (Zalo Bot) **không bật** vì để trống các biến `ZALO_BOT_*`.

## Hạ tầng

| Thành phần | Chọn | Ghi chú |
|---|---|---|
| App | Vercel (gói Hobby đủ cho pilot) | Next.js 15, region gần VN nhất (Singapore) |
| DB + Auth + Storage | Supabase cloud | Chọn region Singapore. Gói free sẽ **tự tạm dừng sau ~7 ngày không hoạt động** → dùng gói Pro khi chạy thật, hoặc nhớ mở app mỗi tuần |
| Nhắc tự động | `pg_cron` + `pg_net` trong Supabase gọi `/api/cron/tick` | Không dùng Vercel Cron |
| Domain | Dùng `*.vercel.app` cho pilot | Gắn domain riêng sau |

## Đã xong trong Giai đoạn 1.1 (code + test)

Các blocker pilot đã được làm và có test tự động (xem `docs/superpowers/plans/2026-10-16-phase1.1.md`):

- Chủ gym tạo tài khoản PT bằng mật khẩu tạm ngay trong màn Quản lý; PT đăng nhập rồi đổi mật khẩu trong Cài đặt.
- Học viên báo bận sát giờ: push hỏi PT trước buổi 90 phút, nút "HV bận"/"HV ốm" một chạm, "Đổi giờ", "Mở lại buổi", checklist có "Học viên huỷ". Huỷ không bao giờ trừ buổi.
- Màn "Chuẩn bị ngày mai" mỗi tối (giờ do từng PT chọn): buổi hôm nay chưa cập nhật, buổi mai cần nhắc, gợi ý xếp lịch, gợi ý bài tập bằng AI.

Cấu hình bổ sung cho pilot: `OPENROUTER_API_KEY` + `AI_MODEL` (không có thì nút "Gợi ý bài tập" tự ẩn, app chạy bình thường). Hướng dẫn lấy khoá: `docs/TESTING-CREDENTIALS.md`.

Còn lại không chặn pilot: sửa/lưu trữ học viên, các lỗi nhỏ trong `docs/superpowers/review-ledger-phase1.md`.

## Các bước deploy

### A. Supabase cloud

1. Tạo project (region Singapore), lưu lại mật khẩu DB.
2. Authentication → Providers → Email: **tắt "Allow new users to sign up"** (không để ai tự đăng ký).
3. Database → Extensions: bật `pg_cron` và `pg_net`.
4. Từ máy dev:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
   `db push` chạy 5 migration (`0001`…`0005`) và **không** chạy `seed.sql`. Tuyệt đối không nạp seed lên production vì có tài khoản demo mật khẩu `demo12345`.
5. Lấy `Project URL`, `anon key`, `service_role key` ở Project Settings → API.

### B. Tạo chủ gym đầu tiên (một lần)

1. Authentication → Users → Add user: email + mật khẩu, tick auto-confirm. Copy `User UID`.
2. SQL Editor:
   ```sql
   insert into gyms (name) values ('Tên trung tâm') returning id;
   insert into members (gym_id, user_id, display_name, role)
   values ('<gym_id>', '<user_uid>', 'Tên chủ gym', 'owner');
   ```
3. Các PT còn lại: đăng nhập chủ gym, vào **Quản lý → Tạo tài khoản PT**, nhập tên và email, app sinh mật khẩu tạm hiện một lần. Gửi mật khẩu cho PT và nhờ đổi ngay trong **Cài đặt → Đổi mật khẩu**.

### C. Vercel

1. Import repo `ductai202/PrivateTrainerHelper`, nhánh deploy là `main` (xem mục "Nhánh" bên dưới).
2. Biến môi trường (Production):

   | Biến | Giá trị |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (không public) |
   | `CRON_SECRET` | chuỗi ngẫu nhiên dài (`openssl rand -hex 32`) |
   | `LINK_SECRET` | chuỗi ngẫu nhiên khác, ký link học viên |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
   | `VAPID_SUBJECT` | `mailto:<email của bạn>` |
   | `OPENROUTER_API_KEY` | khoá OpenRouter (tuỳ chọn; thiếu thì ẩn nút gợi ý bài tập) |
   | `AI_MODEL` | ví dụ `meta-llama/llama-3.3-70b-instruct:free` |
   | `NEXT_PUBLIC_APP_URL` | URL production, ví dụ `https://pt-helper.vercel.app` |

   `NEXT_PUBLIC_*` được gắn vào bản build, nên đổi chúng phải redeploy.
3. Deploy, mở thử `/login`.

### D. Bật nhắc tự động

Sau khi có URL production, trong SQL Editor chạy một lần:
```sql
select public.schedule_tick('https://<app>.vercel.app', '<CRON_SECRET>');
```
Kiểm tra: `select * from cron.job;` thấy job `pt-helper-tick`, và `select * from cron.job_run_details order by start_time desc limit 5;` thấy lần chạy thành công (status `succeeded`).

## Kiểm tra sau deploy (smoke test, ~20 phút)

Làm trên điện thoại thật, không phải máy dev:

- [ ] Đăng nhập chủ gym, tạo 1 PT, PT đăng nhập được bằng mật khẩu tạm và đổi mật khẩu.
- [ ] PT tạo học viên (đủ số đo + meal prep + gói), thấy "Còn N buổi".
- [ ] Tạo buổi hôm nay, trùng lịch bị chặn, buổi liền kề được phép.
- [ ] Màn Hôm nay hiện đúng giờ Việt Nam (không lệch 7 tiếng).
- [ ] Cài lên màn hình chính (Android Chrome; iPhone Safari, iOS 16.4+), mở bằng icon.
- [ ] Cài đặt → "Bật thông báo" → cho phép. Gọi tay để kiểm tra: `curl -X POST https://<app>/api/cron/tick -H "Authorization: Bearer <CRON_SECRET>"` trả `{"sent":…}`.
- [ ] Sau giờ kết thúc một buổi thử, nhận push "Buổi với … đã xong" và bấm vào mở đúng buổi.
- [ ] Huỷ buổi → thấy gợi ý lấp slot → "Mời qua Zalo" mở đúng cuộc chat Zalo và đã copy sẵn tin.
- [ ] Màn "Nhắc lịch ngày mai": tin có kèm link; mở link đó bằng trình duyệt ẩn danh (chưa đăng nhập), bấm Xác nhận → trạng thái buổi đổi sang đã xác nhận.
- [ ] PT B không thấy học viên của PT A (đăng nhập hai tài khoản kiểm tra).
- [ ] Tải ảnh tiến độ, ảnh hiện lại sau khi tải lại trang.

## Kịch bản dùng thử cho PT (1–2 tuần)

Mỗi PT nhập thật khoảng 3–5 học viên của mình (có sự đồng ý của học viên, xem mục dữ liệu bên dưới), rồi dùng hằng ngày:

1. Sáng: mở "Hôm nay" thay cho sổ/giấy hiện tại.
2. Sau mỗi buổi: bấm hoàn thành, ký, ghi bài tập.
3. Tối: mở "Nhắc lịch ngày mai", nhắn học viên qua Zalo.
4. Khi có người huỷ: dùng gợi ý lấp slot.

**Thu phản hồi:** nhóm Zalo chung + một buổi 20 phút cuối tuần 1 và cuối tuần 2. Câu hỏi cố định:
- Hôm nay thao tác nào mất nhiều bước nhất / hay bấm nhầm?
- Có lúc nào bạn vẫn phải quay lại sổ/Zalo thay vì app? Vì sao?
- Gợi ý lấp slot có đúng người bạn định nhắn không?
- Học viên có bấm link xác nhận không? Họ phản ứng thế nào?
- Thông báo có làm phiền / có bị lỡ không?

**Số liệu lấy từ DB** (SQL Editor): số buổi tạo/PT/ngày, tỉ lệ buổi có checklist xong trong 24 giờ, số lần dùng gợi ý lấp slot (`message_log.kind = 'fill_in'`), số buổi học viên tự xác nhận/huỷ qua link.

## Tiêu chí quyết định sau pilot

- **Làm tiếp** nếu: ≥ 4/6 PT dùng ≥ 4 ngày/tuần và nói sẽ không muốn quay lại sổ.
- **Sửa rồi pilot lại** nếu: PT bỏ giữa chừng vì một vài thao tác cụ thể (ghi lại đúng chỗ đó).
- **Dừng và xem lại thiết kế** nếu: PT dùng nhưng vẫn nhắn Zalo y như cũ và app chỉ là sổ ghi thêm (lợi ích không rõ).

## Dữ liệu cá nhân & rủi ro

- App lưu dữ liệu sức khoẻ/số đo của học viên. Trước khi nhập thật, báo học viên và xin đồng ý (Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân coi đây là dữ liệu cần chú ý). Cân nhắc làm một dòng đồng ý trong hợp đồng/đăng ký gói tập.
- Sao lưu: gói Supabase free **không** có backup tự động. Trước khi nhập dữ liệu thật hãy dùng gói Pro (có backup hằng ngày) hoặc tự xuất định kỳ bằng `pg_dump`.
- `SUPABASE_SERVICE_ROLE_KEY` bỏ qua RLS: chỉ đặt trong biến môi trường Vercel, không đưa vào chat/commit.
- Link xác nhận gửi cho học viên không hết hạn nhưng chỉ dùng được đến khi buổi bắt đầu; ai có link có thể xác nhận/huỷ buổi đó. Chấp nhận được cho pilot.

## Nhánh

Hiện toàn bộ code nằm ở nhánh `feat/phase1-mvp`, repo chưa có nhánh `main`. Trước khi nối Vercel:

```bash
git checkout -B main feat/phase1-mvp
git push -u origin main
```

(hoặc mở Pull Request từ `feat/phase1-mvp` vào một `main` rỗng rồi merge). Sau đó đặt `main` làm nhánh mặc định trên GitHub.

## Khi có sự cố

| Triệu chứng | Kiểm tra |
|---|---|
| Đăng nhập xong bị đưa về /login | Tài khoản chưa có dòng trong `members` (bước B) |
| Giờ hiển thị lệch | Không nên xảy ra (giờ cố định UTC+7); nếu có, báo kèm ảnh chụp buổi đó |
| Không có thông báo | Chưa bấm "Bật thông báo"; iPhone chưa thêm vào màn hình chính; `VAPID_*` thiếu; xem `cron.job_run_details` |
| Cron `failed` | `pg_net` chưa bật, URL/secret sai trong `schedule_tick` (chạy lại hàm để đặt lại) |
| Link học viên báo "không hợp lệ" | `LINK_SECRET` bị đổi sau khi gửi link, hoặc thiếu biến này trên Vercel |
