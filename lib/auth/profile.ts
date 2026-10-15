const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export interface ProfileInput {
  gender: Gender | null;
  birthYear: number | null;
}

/** Validates the optional gender / birth year fields of a PT profile form. */
export function parseProfile(
  rawGender: string,
  rawBirthYear: string,
  now: Date = new Date(),
): { ok: true; value: ProfileInput } | { ok: false; error: string } {
  const g = rawGender.trim();
  if (g !== '' && !GENDERS.includes(g as Gender)) return { ok: false, error: 'Giới tính không hợp lệ' };

  const y = rawBirthYear.trim();
  let birthYear: number | null = null;
  if (y !== '') {
    const n = Number(y);
    const max = now.getFullYear() - 14;
    if (!Number.isInteger(n) || n < 1940 || n > max) {
      return { ok: false, error: `Năm sinh phải từ 1940 đến ${max}` };
    }
    birthYear = n;
  }
  return { ok: true, value: { gender: g === '' ? null : (g as Gender), birthYear } };
}
