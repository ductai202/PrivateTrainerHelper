import type { SupabaseClient } from '@supabase/supabase-js';
import { addressFor, type Address } from '@/lib/domain/address';
import type { Database } from '@/lib/supabase/database.types';

/** How a student's PT addresses them. Service-role callers (bot, cron). */
export async function loadStudentAddress(
  db: SupabaseClient<Database>,
  studentId: string,
): Promise<Address | null> {
  const { data: s } = await db
    .from('students')
    .select('full_name, gender, birth_year, pt_id')
    .eq('id', studentId)
    .maybeSingle();
  if (!s) return null;
  const { data: pt } = await db
    .from('members')
    .select('gender, birth_year')
    .eq('id', s.pt_id)
    .maybeSingle();
  return addressFor(
    { gender: pt?.gender ?? null, birthYear: pt?.birth_year ?? null },
    { gender: s.gender, birthYear: s.birth_year, fullName: s.full_name },
  );
}
