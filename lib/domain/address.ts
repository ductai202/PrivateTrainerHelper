/**
 * Vietnamese forms of address between a PT and a student, decided from age and gender.
 * When we are not sure (missing data, "other" gender, within 2 years of each other) we use the
 * neutral "bạn / mình" rather than risk getting someone's anh/chị wrong.
 */
export interface Address {
  /** How the PT calls the student: anh | chị | em | bạn */
  you: 'anh' | 'chị' | 'em' | 'bạn';
  /** How the PT calls themself: anh | chị | em | mình */
  me: 'anh' | 'chị' | 'em' | 'mình';
  /** Given name of the student, e.g. "Lan". */
  name: string;
}

export interface Person {
  gender: string | null;
  birthYear: number | null;
}

const PEER_GAP_YEARS = 2;

export function givenName(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  return words[words.length - 1] ?? fullName;
}

export function cap(s: string): string {
  return s.charAt(0).toLocaleUpperCase('vi') + s.slice(1);
}

const elder = (gender: string | null): 'anh' | 'chị' | null =>
  gender === 'male' ? 'anh' : gender === 'female' ? 'chị' : null;

export function addressFor(pt: Person, student: Person & { fullName: string }): Address {
  const name = givenName(student.fullName);
  const peer: Address = { you: 'bạn', me: 'mình', name };
  if (pt.birthYear === null || student.birthYear === null) return peer;

  const gap = student.birthYear - pt.birthYear; // > 0: the student is younger than the PT
  if (Math.abs(gap) <= PEER_GAP_YEARS) return peer;

  if (gap > 0) {
    const me = elder(pt.gender);
    return me ? { you: 'em', me, name } : peer;
  }
  const you = elder(student.gender);
  return you ? { you, me: 'em', name } : peer;
}
