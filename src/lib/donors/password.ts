import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Optional donor passwords (PRD addendum A1-15). scrypt with a random salt;
 * the parameters are stored with the hash so they can be raised later.
 */
const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

const scrypt = (password: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password.normalize("NFKC"), salt, keylen, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, PARAMS.keylen, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const parts = (stored ?? "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    // Spend the same time as a real check, so timing doesn't reveal whether a password exists.
    await scrypt(password, randomBytes(16), PARAMS.keylen, PARAMS);
    return false;
  }
  const [, N, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64url");
  const key = await scrypt(password, Buffer.from(salt, "base64url"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

/** Returns an error message, or null when the password is acceptable. */
export function checkNewPassword(password: string, confirm: string, email: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  if (password.trim().toLowerCase() === email.trim().toLowerCase())
    return "Don't use your email address as your password.";
  if (/^(.)\1+$/.test(password)) return "Choose a password that isn't one repeated character.";
  if (password !== confirm) return "The two passwords don't match.";
  return null;
}
