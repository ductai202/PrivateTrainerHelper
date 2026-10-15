import { getCurrentMember } from '@/lib/auth/currentMember';
import { logout } from '@/app/login/actions';
import { createServerSupabase } from '@/lib/supabase/server';
import ChangePassword from './ChangePassword';
import ProfileForm from './ProfileForm';
import ReviewTime from './ReviewTime';
import EnablePush from './EnablePush';

export default async function SettingsPage() {
  const m = await getCurrentMember();
  const supabase = await createServerSupabase();
  const { data: row } = await supabase
    .from('members')
    .select('evening_review_time, zalo_bot_chat_id, bot_link_code, gender, birth_year')
    .eq('id', m.id)
    .single();
  const reviewTime = (row?.evening_review_time ?? '22:00').slice(0, 5);
  const zaloConnected = !!row?.zalo_bot_chat_id;
  const botName = process.env.NEXT_PUBLIC_BOT_NAME ?? 'bot của phòng tập';
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
      {m.role === 'pt' && (
        <section className="space-y-2">
          <h2 className="font-medium">Thông tin của bạn</h2>
          <ProfileForm gender={row?.gender ?? null} birthYear={row?.birth_year ?? null} />
        </section>
      )}
      {m.role === 'pt' && (
        <section className="space-y-2">
          <h2 className="font-medium">Nhận thông báo qua Zalo</h2>
          {zaloConnected ? (
            <p className="text-green-700">Đã kết nối Zalo. Nhắn “stop” cho bot nếu muốn ngắt.</p>
          ) : (
            <>
              <p className="text-slate-700">Chưa kết nối Zalo</p>
              <p className="text-sm text-slate-600">
                Mở Zalo, chat với {botName} và nhắn đúng mã này (dùng một lần):
              </p>
              <p data-testid="pt-bot-code" className="font-mono text-2xl tracking-widest select-all">
                {row?.bot_link_code}
              </p>
              <p className="text-xs text-slate-600">
                Khi học viên xác nhận, huỷ hoặc xin đổi giờ, bạn sẽ nhận tin ngay trong Zalo, kể cả khi
                chưa cài app lên màn hình chính.
              </p>
            </>
          )}
        </section>
      )}
      {m.role === 'pt' && (
        <section className="space-y-2">
          <h2 className="font-medium">Nhắc buổi tối</h2>
          <ReviewTime defaultValue={reviewTime} />
        </section>
      )}
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
