# Cần gì để test thật (khoá, token, số điện thoại)

Phần lớn đã được test tự động ở máy local bằng database thật + AI giả lập (xem cuối tài liệu).
Các mục dưới đây là những thứ **chỉ thử được với tài khoản/thiết bị thật**.

## Quy tắc an toàn khi đưa khoá

- **Đừng dán khoá vào khung chat.** Hãy tự mở file `.env.local` trong thư mục dự án, điền giá trị vào rồi nhắn "xong". Mình đọc file đó trên máy bạn.
- Dùng **project Supabase riêng để test**, không dùng project chứa dữ liệu học viên thật.
- Xoay (rotate) hoặc xoá khoá sau khi test xong: Supabase → Project Settings → API → Reset; OpenRouter → Keys → Delete.
- `SUPABASE_SERVICE_ROLE_KEY` bỏ qua mọi phân quyền, chỉ đặt trong `.env.local`/Vercel, không bao giờ dán vào chat hay commit.

## 1. Supabase (database, đăng nhập, ảnh)

Cần cho: kiểm tra deploy thật, `pg_cron` gọi nhắc tự động, upload ảnh tiến độ trên cloud.

1. Vào https://supabase.com → **New project**. Chọn region **Singapore**, đặt mật khẩu database (lưu lại).
2. Vào **Project Settings → API**, lấy 3 giá trị:

   | Điền vào `.env.local` | Lấy ở đâu |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
   | `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (bấm Reveal) |

3. **Authentication → Providers → Email**: tắt "Allow new users to sign up".
4. **Database → Extensions**: bật `pg_cron` và `pg_net`.
5. Mình sẽ chạy migration giúp bạn. Cần thêm **Project ref** (đoạn chữ trong URL, ví dụ `abcdefghijkl`) và **mật khẩu database** ở bước 1. Hoặc bạn tự chạy:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
   Lệnh này **không** nạp dữ liệu demo.
6. Tạo chủ gym đầu tiên theo mục B trong `docs/superpowers/plans/2026-10-15-phase1-pilot-deploy.md`.

## 2. AI gợi ý bài tập — OpenRouter (có model miễn phí)

Cần cho: nút "Gợi ý bài tập" trả lời thật (test tự động chỉ dùng AI giả lập).

1. Đăng ký tại https://openrouter.ai (đăng nhập bằng Google/GitHub là nhanh nhất).
2. **Keys → Create Key**, đặt tên `pt-helper-test`. Copy khoá (dạng `sk-or-v1-...`).
3. Điền vào `.env.local`:
   ```
   OPENROUTER_API_KEY=sk-or-v1-...
   AI_MODEL=meta-llama/llama-3.3-70b-instruct:free
   ```
4. Chọn model: vào https://openrouter.ai/models, bật bộ lọc **Free**, chọn model có đuôi `:free`.
   Danh sách model miễn phí đổi thường xuyên, nên nếu mình báo lỗi "model không tồn tại" thì chỉ cần đổi `AI_MODEL`.
   Nên chọn model có hỗ trợ tiếng Việt tốt (Llama 3.3 70B, Qwen, DeepSeek).

Lưu ý:
- **Giới hạn của gói free**: số request mỗi phút/ngày rất thấp (mình nhớ khoảng vài chục request/ngày, tăng lên nếu nạp vài đô credit; con số có thể đã đổi, hãy xem ở trang OpenRouter). Đủ cho test, không đủ cho 6 PT dùng hằng ngày.
- **Quyền riêng tư**: một số model miễn phí có thể lưu/huấn luyện trên prompt. App chỉ gửi tên gọi, mục tiêu, chấn thương, số đo và bài tập gần đây (không gửi SĐT, không gửi họ tên đầy đủ), nhưng đó vẫn là dữ liệu sức khoẻ. Với học viên thật nên dùng model trả phí/có cam kết không lưu, và báo học viên.
- Kết quả chỉ là **bản nháp**, PT luôn phải xem và sửa.

## 3. Zalo

Có **ba** thứ khác nhau, mỗi thứ cần khác nhau:

### 3a. Gửi tin Zalo cá nhân của PT (đã chạy, Giai đoạn 1)
Không cần khoá hay API. App chỉ mở `https://zalo.me/<số điện thoại>` và copy sẵn nội dung.
- **Cần:** 1 số điện thoại Zalo thật của người nhận (có thể là số của chính bạn) để thử bấm "Nhắc qua Zalo" trên điện thoại, và điện thoại có cài Zalo.
- Nhập số đó vào một học viên test trong app.

### 3b. Link cho học viên (đã chạy, Giai đoạn 2)
Không cần khoá Zalo. Chỉ cần `LINK_SECRET` (chuỗi ngẫu nhiên, mình tự sinh trong `.env.local`) và địa chỉ app mà điện thoại truy cập được (URL Vercel, hoặc ngrok/Cloudflare Tunnel khi test local). Có hai loại link: theo buổi (`/c/...`, xác nhận/huỷ) và cá nhân (`/s/...`, xem số buổi, xin đổi giờ, khai giờ rảnh, chờ slot).

### 3c. Zalo Bot tự nhắn (Giai đoạn 3, **chưa thử với Zalo thật**)
Cần cho: bot tự nhắc lịch, học viên trả lời OK/Huỷ.
- **Cần:** tài khoản Zalo của bạn để tạo bot trên Zalo Bot Platform, **bot token**, một **webhook secret** bạn tự đặt (8–256 ký tự), và 1 tài khoản Zalo thứ hai để đóng vai học viên.
- Mình **chưa xác minh được trang chính thức** của Zalo Bot Platform. Tài liệu bên thứ ba nhắc tới `bot.zapps.me/docs` và API tại `bot-api.zaloplatforms.com`. Hãy tìm "Zalo Bot Platform" / "Zalo Bot Creator", tạo bot, và gửi mình đường link trang tài liệu bạn thấy để mình đối chiếu định dạng `sendMessage` và cách đăng ký webhook.
- Điền vào `.env.local`: `ZALO_BOT_TOKEN`, `ZALO_BOT_WEBHOOK_SECRET`. Nếu host API khác mặc định thì đặt thêm `ZALO_BOT_API_BASE`.
- Kiểm tra nhanh token: `node scripts/zalo-bot.mjs check`. Đăng ký webhook: `node scripts/zalo-bot.mjs set-webhook https://<app>/api/zalo-bot/webhook` (tên lệnh theo mô tả của SDK cộng đồng, chưa xác minh với tài liệu chính thức).
- Luồng thử thật: PT mở hồ sơ học viên để lấy mã → học viên (Zalo thứ hai) nhắn mã cho bot → app xác nhận kết nối → tạo buổi bắt đầu sau ~100 phút rồi gọi `POST /api/cron/tick` → học viên nhận câu hỏi "vẫn tập chứ?" → trả lời "OK" hoặc "Bận" → PT nhận push.
- Webhook cần URL HTTPS công khai (`https://<app>/api/zalo-bot/webhook`); khi test local dùng ngrok hoặc Cloudflare Tunnel.

Chưa cần: OA (Official Account) hay ZNS. Chỉ cân nhắc khi muốn gửi tin có phí theo số điện thoại.

## 4. Thông báo đẩy (Web Push)

Cần cho: nhận push "vẫn tập chứ?" trên điện thoại thật.

```bash
npx web-push generate-vapid-keys
```
Điền vào `.env.local`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<Public Key>
VAPID_PRIVATE_KEY=<Private Key>
VAPID_SUBJECT=mailto:<email của bạn>
```
- **Điện thoại:** Android (Chrome) hoặc iPhone iOS 16.4+ (Safari, phải "Thêm vào MH chính" rồi mở từ icon).
- Cần địa chỉ HTTPS (Vercel hoặc tunnel); push không chạy trên `http://` ngoài `localhost`.

## 5. Triển khai (chỉ khi muốn thử trên URL thật)

- Tài khoản GitHub (đã có) và **Vercel** (đăng nhập bằng GitHub, gói Hobby miễn phí).
- Các biến môi trường theo bảng trong `docs/superpowers/plans/2026-10-15-phase1-pilot-deploy.md`, thêm `OPENROUTER_API_KEY`, `AI_MODEL`.

## Tóm tắt: gửi mình những gì

| Muốn test | Bạn điền vào `.env.local` / chuẩn bị |
|---|---|
| Deploy + cron thật | 3 giá trị Supabase, project ref, mật khẩu DB |
| AI thật | `OPENROUTER_API_KEY`, `AI_MODEL` |
| Push thật | 3 giá trị VAPID, 1 điện thoại, URL HTTPS |
| Mở Zalo thật | 1 số điện thoại Zalo, điện thoại có Zalo |
| Zalo Bot thật | `ZALO_BOT_TOKEN`, `ZALO_BOT_WEBHOOK_SECRET`, link tài liệu, 1 Zalo thứ hai, URL HTTPS |

## Đã được test tự động (không cần khoá gì)

Chạy bằng `npm run test`, `npx supabase test db`, `npm run e2e`:

- **Unit:** giờ VN, số điện thoại, gói buổi, trùng lịch, lấp slot, checklist, quy tắc push (trước buổi 90 phút, giờ nhắc từng PT), gợi ý xếp lịch, mật khẩu, token link, nhận diện trả lời bot, prompt/parse/lỗi của AI.
- **Integration (database Supabase thật + trình duyệt thật + Zalo Bot/OpenRouter giả lập):** đăng nhập, phân quyền PT/owner (RLS), tạo học viên, lịch, huỷ 1 chạm, đổi giờ, mở lại buổi, checklist, nhắc lịch, link học viên, webhook bot, route cron (đánh dấu precheck, giờ nhắc, chống gửi trùng), gợi ý xếp lịch và đặt buổi, AI qua máy chủ giả lập OpenRouter (kiểm tra cả nội dung gửi đi không chứa SĐT).
- **Chưa test tự động được:** push thật tới điện thoại, chất lượng câu trả lời của model, Zalo/Zalo Bot thật, `pg_cron` trên Supabase cloud, cài PWA trên iPhone/Android.
