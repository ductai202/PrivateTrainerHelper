# PT Helper

Web app (PWA, mobile-first) cho PT gym private: hồ sơ học viên, tiến độ, meal prep, gói buổi,
lịch ngày/tuần, checklist sau buổi, gợi ý lấp slot khi huỷ, nhắc lịch qua Zalo (gửi thủ công,
không gọi API Zalo trong Giai đoạn 1).

Thiết kế: `docs/superpowers/specs/2026-10-15-pt-scheduling-design.md`
Kế hoạch: `docs/superpowers/plans/2026-10-15-pt-scheduling-phase1.md`

## Chạy local

Cần Node 20+, Docker Desktop.

```bash
npm install
npx supabase start          # lần đầu tải image, mất vài phút
cp .env.example .env.local  # điền các giá trị in ra bởi `npx supabase status`
npm run dev                 # http://localhost:3000
```

`.env.local` cho local:

| Biến | Lấy ở đâu |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `API URL` của `npx supabase status` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `Publishable/anon key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `Secret/service_role key` (chỉ server) |
| `CRON_SECRET` | chuỗi bất kỳ, dùng cho `/api/cron/tick` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |

Tài khoản demo (chỉ local, mật khẩu `demo12345`): `owner@demo.test`, `pt.a@demo.test`, `pt.b@demo.test`.
`npx supabase db reset` đặt lại dữ liệu mẫu.

## Kiểm thử

```bash
npm run test               # unit (Vitest)
npx supabase test db       # RLS (pgTAP)
npm run e2e                # Playwright, viewport 375px
```

## Triển khai

1. Tạo project Supabase cloud, chạy migrations: `npx supabase link` rồi `npx supabase db push`.
2. Tạo user owner trong Auth, thêm 1 dòng `gyms` và 1 dòng `members` (role `owner`) cho user đó.
3. Deploy lên Vercel, đặt các biến môi trường ở bảng trên (URL/keys của project cloud).
4. Bật nhắc tự động: trong SQL editor của Supabase chạy một lần
   `select public.schedule_tick('https://<app>.vercel.app', '<CRON_SECRET>');`
   (`pg_cron` gọi `/api/cron/tick` mỗi 10 phút).

## Cài lên điện thoại cho PT

- **Android (Chrome):** mở link, menu ⋮ → “Cài đặt ứng dụng”.
- **iPhone (Safari):** nút Chia sẻ → “Thêm vào MH chính”. Cần iOS 16.4+ mới nhận được thông báo.
- Mở app từ icon vừa tạo → Cài đặt → “Bật thông báo”.

## Zalo

- Giai đoạn 1: app soạn sẵn tin, bấm nút để copy và mở cuộc chat Zalo (`https://zalo.me/<SĐT>`).
- Giai đoạn 2: học viên bấm link xác nhận/huỷ theo buổi (`app/c/`) hoặc dùng link cá nhân `app/s/` để xem số buổi, xin đổi giờ, khai giờ rảnh, đăng ký chờ slot.
- Giai đoạn 3: Zalo Bot (API chính thức) — xem `lib/zalo/` và `app/api/zalo-bot/webhook`; `node scripts/zalo-bot.mjs check` kiểm tra token, `set-webhook <url>` đăng ký webhook.
- Không dùng thư viện giả lập Zalo cá nhân (zca-js…) vì có nguy cơ bị khoá tài khoản.
