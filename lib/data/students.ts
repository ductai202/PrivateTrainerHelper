import { createServerSupabase } from '@/lib/supabase/server';
import { remainingAcrossPackages } from '@/lib/domain/packages';
import type { SessionLite } from '@/lib/domain/types';

export interface StudentRow {
  id: string;
  fullName: string;
  phone: string;
  ptName: string;
  remaining: number | null;
  expiresOn: string | null;
  expiringSoon: boolean;
}

export async function listStudents(): Promise<StudentRow[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('students')
    .select(
      `id, full_name, phone, members!students_pt_id_fkey(display_name),
       packages(id, total_sessions, expires_on, created_at),
       sessions(package_id, status, student_signed)`,
    )
    .eq('archived', false)
    .order('full_name');
  const now = Date.now();
  return (data ?? []).map((s) => {
    const pkg = [...(s.packages ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const remaining = pkg
      ? remainingAcrossPackages(
          (s.packages ?? []).map((p) => p.total_sessions),
          (s.sessions ?? []).map(
            (x) => ({ status: x.status, studentSigned: x.student_signed }) as SessionLite,
          ),
        )
      : null;
    const expiresOn = pkg?.expires_on ?? null;
    const expiringSoon =
      (remaining !== null && remaining <= 2) ||
      (expiresOn !== null && new Date(expiresOn).getTime() - now < 7 * 86400000);
    return {
      id: s.id,
      fullName: s.full_name,
      phone: s.phone,
      ptName: (s.members as { display_name: string } | null)?.display_name ?? '',
      remaining,
      expiresOn,
      expiringSoon: pkg ? expiringSoon : false,
    };
  });
}
