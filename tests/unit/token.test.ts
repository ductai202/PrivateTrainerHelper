import { describe, it, expect } from 'vitest';
import { signSessionToken, verifySessionToken } from '@/lib/links/token';

const SECRET = 'test-secret';
const ID = 'f5651989-b6ac-4828-bfeb-1cc0483e0cb1';

describe('session link token', () => {
  it('round-trips a session id', () => {
    const t = signSessionToken(ID, SECRET);
    expect(verifySessionToken(t, SECRET)).toBe(ID);
  });
  it('rejects tampered, wrong-secret and malformed tokens', () => {
    const t = signSessionToken(ID, SECRET);
    expect(verifySessionToken(t.slice(0, -2) + 'xx', SECRET)).toBeNull();
    expect(verifySessionToken(t, 'other')).toBeNull();
    expect(verifySessionToken('garbage', SECRET)).toBeNull();
    expect(verifySessionToken('', SECRET)).toBeNull();
  });
});
