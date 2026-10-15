import { getCurrentMember } from '@/lib/auth/currentMember';
import { logout } from '@/app/login/actions';
import ChangePassword from './ChangePassword';
import EnablePush from './EnablePush';

export default async function SettingsPage() {
  const m = await getCurrentMember();
  return (
    <main className="space-y-6 p-4">
      <h1 className="text-xl font-semibold">Cài đặt</h1>
      <p>Xin chào, {m.displayName}</p>
      <section className="space-y-2">
        <h2 className="font-medium">Thêm vào màn hình chính</h2>
        <p className="text-sm text-slate-600">
          iPhone: mở bằng Safari, bấm nút Chia sẻ rồi chọn “Thêm vào MH chính”. Cần iOS 16.4 trở lên
          để nhận thông báo. Android: menu ⋮ rồi chọn “Cài đặt ứng dụng”.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">Thông báo</h2>
        <EnablePush />
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">Đổi mật khẩu</h2>
        <ChangePassword />
      </section>
      <form action={logout}>
        <button className="min-h-12 rounded border px-4">Đăng xuất</button>
      </form>
    </main>
  );
}
