// Password hashing with backward-compatible verification.
//
// Historically passwords were stored in plain text. We migrate to bcrypt
// without locking anyone out: verifyPassword accepts a legacy plaintext match
// AND a bcrypt match, and callers re-hash legacy passwords on successful login.
import bcrypt from "bcryptjs";

const BCRYPT_RE = /^\$2[aby]\$/;

export const isHashed = (stored: string | null | undefined): boolean =>
  typeof stored === "string" && BCRYPT_RE.test(stored);

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, 10);

export const verifyPassword = async (
  plain: string,
  stored: string | null | undefined,
): Promise<boolean> => {
  if (stored == null) return false;
  if (isHashed(stored)) return bcrypt.compare(plain, stored);
  // Legacy plaintext record.
  return plain === stored;
};
