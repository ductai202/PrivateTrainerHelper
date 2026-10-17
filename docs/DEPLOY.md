# Hướng dẫn deploy từ đầu đến cuối

Mục tiêu: đưa app lên mạng (Supabase + Vercel), có tài khoản admin riêng, và sau này sửa code xong chỉ cần bấm một nút trên GitHub để cập nhật.

Thời gian: khoảng 45 phút lần đầu. Chi phí để chạy thử: 0đ (gói free). Khi dùng thật nên dùng Supabase Pro (khoảng 25 USD/tháng) và Vercel Pro (20 USD/tháng, vì gói Hobby chỉ cho mục đích phi thương mại). Xem bảng chi phí cuối trang.

```
GitHub (code) ──bấm Run workflow──▶ test ──▶ migration DB (Supabase) ──▶ build + deploy (Vercel)
                                                   │                           │
                                              Postgres + Auth + Ảnh        Next.js app
                                                   ▲                           │
                          pg_cron mỗi 10 phút ─────┴──── POST /api/cron/tick ◀─┘
```

## Bạn sẽ cần

| Thứ | Ở đâu | Dùng để |
|---|---|---|
| Tài khoản GitHub | đã có (`ductai202`) | chứa code, chạy pipeline |
| Tài khoản Supabase | https://supabase.com | database, đăng nhập, ảnh |
| Tài khoản Vercel | https://vercel.com (đăng nhập bằng GitHub) | chạy web app |
| Node.js 20+ và `git` trên máy | đã có | chạy vài lệnh một lần |

## Phần 0. Nhánh `master`

Code đã nằm trên nhánh `master` (nhánh mặc định) của repo. Pipeline CI/CD dùng nhánh này, không cần làm gì thêm.

## Phần 1. Supabase (database)

1. Vào https://supabase.com/dashboard → **New project**.
   - Organization: của bạn. Name: `pt-helper`.
   - **Database Password**: bấm *Generate*, **lưu lại** (sẽ cần ở phần 4).
   - Region: **Southeast Asia (Singapore)**.
2. Chờ project tạo xong (1–2 phút).
3. **Tắt đăng ký tự do** (rất quan trọng, để không ai tự tạo tài khoản được): *Authentication → Sign In / Providers → Email* → tắt **Allow new users to sign up** → Save.
4. **Bật extension cho nhắc tự động**: *Database → Extensions* → tìm `pg_cron` bật, tìm `pg_net` bật.
5. (Supabase đang chuyển dần khỏi khoá `anon`/`service_role` sang `sb_publishable_`/`sb_secret_`; cả hai kiểu chạy song song. Tên biến trong app giữ nguyên.) Lấy 4 giá trị, chép vào một file tạm (sau này dán vào Vercel/GitHub):

   | Tên | Lấy ở đâu |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | *Project Settings → API* → **Project URL** |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *Project Settings → API Keys* → **Publishable key** (`sb_publishable_...`). Khoá cũ `anon` (bắt đầu `eyJ`) cũng dùng được |
   | `SUPABASE_SERVICE_ROLE_KEY` | cùng trang → **Secret key** (`sb_secret_...`, bấm Reveal). Khoá cũ `service_role` cũng dùng được. **Không chia sẻ cho ai** |
   | `SUPABASE_PROJECT_REF` | *Project Settings → General* → **Reference ID** (chuỗi ~20 ký tự) |

6. Tạo **Access Token** cho GitHub dùng: https://supabase.com/dashboard/account/tokens → **Generate new token** → tên `github-deploy` → copy (chỉ hiện một lần). Đây là `SUPABASE_ACCESS_TOKEN`.

## Phần 2. Vercel (web app)

1. https://vercel.com/new → **Import Git Repository** → chọn `ductai202/PrivateTrainerHelper`.
2. Ở màn cấu hình:
   - Framework Preset: **Next.js** (tự nhận).
   - **Production Branch**: `master`.
   - Mở **Environment Variables**, thêm từng dòng (chọn Environment *Production*):

     | Name | Value |
     |---|---|
     | `NEXT_PUBLIC_SUPABASE_URL` | Project URL ở phần 1 |
     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
     | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
     | `CRON_SECRET` | chuỗi ngẫu nhiên dài (xem lệnh bên dưới) |
     | `LINK_SECRET` | một chuỗi ngẫu nhiên **khác** |
     | `NEXT_PUBLIC_APP_URL` | địa chỉ app, ví dụ `https://pt-helper.vercel.app` (xem lưu ý) |
     | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public Key (lệnh bên dưới) |
     | `VAPID_PRIVATE_KEY` | Private Key |
     | `VAPID_SUBJECT` | `mailto:ductainguyentran@gmail.com` |
     | `OPENROUTER_API_KEY` | khoá OpenRouter mới (tuỳ chọn, không có thì ẩn nút gợi ý bài tập) |
     | `AI_MODEL` | `google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free,openrouter/free` |
     | `ZALO_BOT_TOKEN` | token bot (tuỳ chọn) |
     | `ZALO_BOT_WEBHOOK_SECRET` | chuỗi bạn tự đặt 8–256 ký tự (tuỳ chọn) |
     | `NEXT_PUBLIC_BOT_NAME` | tên bot hiện trong app, ví dụ `Bot Personal Trainer` |

   Sinh chuỗi ngẫu nhiên và khoá VAPID (chạy trên máy bạn):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # chạy 2 lần: CRON_SECRET, LINK_SECRET
   npx web-push generate-vapid-keys
   ```
   **Lưu ý `NEXT_PUBLIC_APP_URL`:** tên miền của Vercel chỉ biết sau khi tạo project. Tạo project trước với giá trị tạm, xem tên miền ở tab *Domains*, rồi quay lại sửa biến này (biến `NEXT_PUBLIC_*` cần deploy lại mới có hiệu lực).
3. **Chưa bấm Deploy.** Thay vào đó, ở trang tạo project bấm **Deploy** cũng được (lần đầu sẽ build thử), nhưng cách gọn nhất là để pipeline GitHub làm. Nếu đã lỡ deploy thì không sao.
4. Tắt auto-deploy theo git: file `vercel.json` trong repo đã đặt `"git": {"deploymentEnabled": false}`, nên Vercel **không** tự deploy khi bạn push. Chỉ pipeline mới deploy.
5. Lấy 3 giá trị cho GitHub:
   ```bash
   npm i -g vercel
   vercel login
   vercel link          # trong thư mục dự án, chọn đúng project
   ```
   Sau `vercel link`, mở file `.vercel/project.json`:
   - `orgId` → `VERCEL_ORG_ID`
   - `projectId` → `VERCEL_PROJECT_ID`

   Tạo token: https://vercel.com/account/tokens → **Create** → tên `github-deploy`, scope là team/account của bạn → copy. Đây là `VERCEL_TOKEN`.

## Phần 3. GitHub (pipeline CI/CD)

1. Repo → **Settings → Environments → New environment** → tên **`production`**.
2. Trong environment `production` → **Add environment secret**, thêm 7 secret:

   | Secret | Giá trị |
   |---|---|
   | `SUPABASE_ACCESS_TOKEN` | token ở phần 1, bước 6 |
   | `SUPABASE_PROJECT_REF` | Reference ID |
   | `SUPABASE_DB_PASSWORD` | mật khẩu database ở phần 1, bước 1 |
   | `VERCEL_TOKEN` | token Vercel |
   | `VERCEL_ORG_ID` | `orgId` |
   | `VERCEL_PROJECT_ID` | `projectId` |
   | `PRODUCTION_URL` | địa chỉ app, ví dụ `https://pt-helper.vercel.app` (không có dấu `/` ở cuối) |

3. (Khuyên dùng) **Settings → Branches → Add rule** cho `master`: bật *Require a pull request before merging* và *Require status checks* (chọn job **Lint, types, unit tests** và **Database, integration and end-to-end tests**). Từ đó không ai (kể cả bạn) đẩy thẳng code chưa test vào `master`.

## Phần 4. Lần deploy đầu tiên

1. GitHub → tab **Actions** → chọn **Deploy** ở cột trái → **Run workflow**.
2. Nhánh: `master`. Ô *Gõ chữ deploy*: gõ `deploy`. Giữ tick *Chạy migration*. Bấm **Run workflow**.
3. Pipeline chạy lần lượt (khoảng 10–15 phút):
   1. **Confirm**: kiểm tra bạn đã gõ `deploy`.
   2. **Tests must pass first**: chạy toàn bộ test. Đỏ thì dừng, không deploy gì cả.
   3. **Migrate and deploy**: áp dụng migration vào Supabase, build và deploy lên Vercel.
   4. **Smoke test**: gọi thử `/login` (phải 200) và `/api/cron/tick` không khoá (phải 401).
4. Tất cả xanh nghĩa là app đã lên. Mở `PRODUCTION_URL/login` để xem.

Lỗi thường gặp ở bước này:

| Thông báo | Nguyên nhân |
|---|---|
| `supabase link` báo sai mật khẩu | `SUPABASE_DB_PASSWORD` sai hoặc đã đổi; đặt lại ở *Project Settings → Database* rồi cập nhật secret |
| `vercel pull` báo project không tìm thấy | `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` sai hoặc token không thuộc team đó |
| Smoke test login ≠ 200 | `PRODUCTION_URL` sai, hoặc Vercel bật *Deployment Protection* cho domain đó (tắt ở *Settings → Deployment Protection* cho Production) |
| Test đỏ ở bước 2 | Sửa lỗi theo log, push lại, chạy lại Deploy |

## Phần 5. Tạo tài khoản admin (một lần)

Tài khoản admin cố định là `ductainguyentran@gmail.com`. Chạy trên máy bạn (cần file env trỏ tới Supabase **thật**). Admin này là **admin nền tảng**: thấy và sửa mọi trung tâm.

1. Tạo file `.env.production.local` trong thư mục dự án (file này đã nằm trong `.gitignore`, không bị commit):
   ```
   NEXT_PUBLIC_SUPABASE_URL=<Project URL>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key>
   ```
2. Chạy:
   ```bash
   npm run create-admin -- --gym "Tên phòng tập của bạn" --env .env.production.local
   ```
   Script hỏi mật khẩu (gõ không hiện ra, ít nhất 8 ký tự, nhập hai lần). Mật khẩu **không** được lưu ở đâu.
3. Muốn đổi mật khẩu admin sau này: chạy lại với `--reset-password`.
4. Xoá `.env.production.local` sau khi xong nếu không cần nữa.

Script chạy lại bao nhiêu lần cũng an toàn: không tạo trùng tài khoản hay phòng tập.

**Thêm trung tâm thứ hai:** chạy lại với tên khác, ví dụ `npm run create-admin -- --gym "Trung tâm Cầu Giấy" --env .env.production.local`. Admin sẽ thấy cả hai trung tâm. Có thể tạo trung tâm và chủ trung tâm ngay trong app: đăng nhập admin → tab **Trung tâm**. Chủ một trung tâm chỉ thấy trung tâm của mình; admin nền tảng đổi qua lại bằng ô chọn trung tâm ở đầu trang.

## Phần 6. Bật nhắc tự động (một lần)

Vào Supabase → **SQL Editor** → New query, dán (thay hai chỗ) rồi **Run**:

```sql
select public.schedule_tick('https://pt-helper.vercel.app', '<CRON_SECRET>');
```

Kiểm tra:
```sql
select jobname, schedule, active from cron.job;
select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
```
Sau 10 phút phải thấy dòng `succeeded`. (Migration 0010 đặt thời gian chờ request của `pg_net` là 30 giây, mặc định 5 giây quá ngắn khi app có AI chạy.) Từ đây app tự nhắc PT trước buổi 90 phút, nhắc tối, và hỏi học viên qua bot.

## Phần 7. Zalo Bot (tuỳ chọn)

1. Vào trang quản lý bot → **Thiết lập chung**:
   - **Webhook URL**: `https://<tên-miền-app>/api/zalo-bot/webhook`
   - **Secret Token**: đúng chuỗi bạn đặt cho `ZALO_BOT_WEBHOOK_SECRET` trên Vercel.
   - **Lưu thay đổi**.
2. Kiểm tra: `node scripts/zalo-bot.mjs check` (cần `ZALO_BOT_TOKEN` trong env).
3. Đổi biến trên Vercel xong phải chạy lại workflow **Deploy** để có hiệu lực.

## Phần 8. Kiểm tra sau deploy (10 phút)

- [ ] Đăng nhập bằng admin → **Quản lý → Tạo tài khoản PT** (nhập tên, email, giới tính, năm sinh) → ghi lại mật khẩu tạm.
- [ ] Đăng nhập PT bằng điện thoại, đổi mật khẩu, điền **Cài đặt → Thông tin của bạn**.
- [ ] PT thêm một học viên thử, tạo buổi, mở **Tối nay** thấy lời nhắn đúng cách xưng hô.
- [ ] **Cài đặt → Nhận thông báo qua Zalo**: nhắn mã cho bot, bot trả lời đã kết nối.
- [ ] Thêm app vào màn hình chính, bật thông báo, huỷ một buổi và thấy thông báo về.
- [ ] Học viên mở link cá nhân (không đăng nhập) thấy lịch của mình.

## Giữ Supabase free không bị tạm dừng

Supabase tạm dừng project Free khi **một tuần liền** gần như không có hoạt động database (sau khi dừng, bạn có 90 ngày để khôi phục trong Dashboard). Gói trả phí không bị dừng.

App đã có sẵn hai lớp chống dừng, không cần "trick" thủ công:

1. `pg_cron` ở phần 6 gọi `/api/cron/tick` mỗi 10 phút, mỗi lần đó app đọc database.
2. Workflow **Keepalive** (`.github/workflows/keepalive.yml`) chạy **mỗi ngày** và gọi `PRODUCTION_URL/api/health`; endpoint này chạy một truy vấn thật vào database. Nếu lỗi, workflow đỏ và GitHub gửi mail cho bạn.

Dùng `PRODUCTION_URL` là secret ở phần 3 (workflow chỉ đọc secret này, không cần thêm gì). Ping mỗi ngày an toàn hơn mỗi 6 ngày vì dư địa 7 ngày cho phép lỡ vài lần chạy.

## Xem log ở đâu

| Cần xem | Chỗ xem | Lưu giữ |
|---|---|---|
| Lỗi của web app (server action, API, webhook Zalo) | Vercel → project → **Logs** (lọc `Error`, hoặc theo đường dẫn như `/api/zalo-bot/webhook`). Hoặc trên máy: `npx vercel logs --environment production --since 1h` | **Hobby 1 giờ**, Pro 1 ngày, Pro + Observability Plus 30 ngày |
| Build / deploy lỗi | Vercel → project → **Deployments** → chọn bản → *Build Logs*; hoặc log của job trong GitHub Actions | lâu dài |
| Pipeline CI/CD | GitHub → **Actions** → chọn lần chạy → từng bước | lâu dài |
| Truy vấn database, đăng nhập, API | Supabase → **Logs** (menu trái; có *API*, *Postgres*, *Auth*) | gói Free ngắn (khoảng 1 ngày) |
| Nhắc tự động có chạy không | Supabase SQL Editor: `select status, return_message, start_time from cron.job_run_details order by start_time desc limit 20;` | vài ngày gần nhất |
| App đã gửi tin gì cho ai | bảng `message_log` (Supabase → Table Editor) | lâu dài |
| Bot Zalo nhận tin gì | bảng `bot_updates` | lâu dài |

Lưu ý: log runtime của Vercel Hobby chỉ giữ **1 giờ**. Gặp lỗi thì xem ngay, hoặc dùng bảng `message_log` / `bot_updates` để dò lại việc đã xảy ra. Dùng Pro (đằng nào cũng cần cho thương mại) thì được 1 ngày.

## Quy trình sửa lỗi và cập nhật về sau

```
nhánh mới ──▶ sửa code ──▶ push ──▶ mở Pull Request ──▶ CI tự chạy (xanh) ──▶ Merge vào master
                                                                                  │
                                                  Actions → Deploy → Run workflow → gõ "deploy"
```

1. `git checkout -b fix/ten-loi`, sửa, `git commit`, `git push`.
2. Trên GitHub mở **Pull Request** vào `master`. Workflow **CI** tự chạy, xem kết quả ngay trên PR.
3. CI xanh thì **Merge**.
4. Khi sẵn sàng đưa lên server: **Actions → Deploy → Run workflow** → gõ `deploy` → Run. Pipeline tự test lại, chạy migration mới (nếu có) rồi deploy.

Ghi chú:
- **Migration chỉ thêm, không xoá.** File mới trong `supabase/migrations/` được áp dụng tự động ở bước deploy. Muốn đổi cấu trúc bảng thì viết migration mới, đừng sửa file cũ đã deploy.
- **Quay lại bản cũ (rollback) code:** Vercel → project → tab *Deployments* → chọn bản trước → **Promote to Production**. Database không tự lùi; nếu migration mới gây lỗi thì viết migration sửa.
- **Đổi biến môi trường** (Vercel → Settings → Environment Variables) cần chạy lại workflow Deploy để áp dụng.
- **Chạy lại deploy mà không có thay đổi migration:** bỏ tick *Chạy migration* khi Run workflow.

## Chi phí tham khảo

| Dịch vụ | Gói | Giá | Ghi chú |
|---|---|---|---|
| Vercel | Hobby | 0đ | chỉ cho mục đích **phi thương mại**; dùng cho phòng gym kinh doanh thì cần Pro. Log chỉ giữ 1 giờ |
| Vercel | Pro | 20 USD/tháng | dùng thương mại, log giữ 1 ngày |
| Supabase | Free | 0đ | 2 project, DB 500 MB, 1 GB file, 50.000 người dùng/tháng; tạm dừng nếu 7 ngày không có hoạt động (đã có keepalive), không sao lưu |
| Supabase | Pro | ~25 USD/tháng | sao lưu hằng ngày, không tạm dừng; nên dùng khi có dữ liệu thật |
| OpenRouter | model `:free` | 0đ | giới hạn số lượt mỗi ngày; chỉ cần cho nút gợi ý bài tập |
| Zalo Bot | miễn phí | 0đ | |

## Bảo mật cần nhớ

- Không bao giờ commit file `.env*`; chúng đã nằm trong `.gitignore`.
- `SUPABASE_SERVICE_ROLE_KEY` bỏ qua mọi phân quyền: chỉ đặt trong Vercel/GitHub Secrets.
- Khoá, token đã từng dán vào chat hoặc gửi qua tin nhắn: hãy tạo lại (OpenRouter, token bot Zalo).
- Dữ liệu sức khoẻ học viên là dữ liệu nhạy cảm: nói với học viên và bật Supabase Pro để có sao lưu.
