import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Donor sessions (PRD addendum A1-5): a signed, HttpOnly cookie holding the
 * donor's email and an expiry. Tampered or expired cookies are ignored.
 */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const LINK_TTL_MS = 20 * 60 * 1000;

export const cookieName = () => (process.env.NODE_ENV === "production" ? "__Host-ck_donor" : "ck_donor");
/** Remembers which email a code was sent to, so the code page needn't put it in the URL. */
export const pendingCookieName = () =>
  process.env.NODE_ENV === "production" ? "__Host-ck_donor_pending" : "ck_donor_pending";

const secret = () => {
  const s = process.env.PAYLOAD_SECRET;
  if (!s) throw new Error("PAYLOAD_SECRET is required for donor sessions");
  return s;
};

const sign = (value: string, purpose = "donor-session") =>
  createHmac("sha256", secret()).update(`${purpose}:${value}`).digest("base64url");

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export function createSession(
  email: string,
  now = Date.now(),
  ttl = SESSION_TTL_MS,
  purpose = "donor-session",
): string {
  const body = Buffer.from(JSON.stringify({ e: normaliseEmail(email), x: now + ttl })).toString("base64url");
  return `${body}.${sign(body, purpose)}`;
}

export function readSession(
  cookie: string | undefined | null,
  now = Date.now(),
  purpose = "donor-session",
): { email: string } | null {
  if (!cookie) return null;
  const [body, sig] = cookie.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body, purpose));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(body, "base64url").toString()) as { e?: string; x?: number };
    if (typeof e !== "string" || typeof x !== "number" || x < now) return null;
    return { email: e };
  } catch {
    return null;
  }
}

/** A fresh sign-in token and the hash that is stored. */
export function newLoginToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** A 6-digit sign-in code (A1-14). Leading zeros are kept. */
export const newSignInCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

/**
 * Keyed hash of a code, bound to the email. Six digits are easy to brute-force
 * offline, so a plain hash would not protect a leaked database; the server secret does.
 */
export const hashSignInCode = (email: string, code: string) =>
  createHmac("sha256", secret())
    .update(`donor-code:${normaliseEmail(email)}:${code}`)
    .digest("hex");

export function codesMatch(stored: string | null | undefined, email: string, code: string): boolean {
  if (!stored || !/^\d{6}$/.test(code)) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(hashSignInCode(email, code));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Mask an email for display: jane.doe@example.com → j•••e@example.com */
export function maskEmail(email: string): string {
  const [user = "", domain = ""] = email.split("@");
  const shown = user.length <= 2 ? `${user[0] ?? ""}•••` : `${user[0]}•••${user[user.length - 1]}`;
  return `${shown}@${domain}`;
}

export const createPending = (email: string, now = Date.now()) =>
  createSession(email, now, LINK_TTL_MS, "donor-pending");
export const readPending = (cookie: string | undefined | null, now = Date.now()) =>
  readSession(cookie, now, "donor-pending");
