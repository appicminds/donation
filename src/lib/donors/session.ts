import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Donor sessions (PRD addendum A1-5): a signed, HttpOnly cookie holding the
 * donor's email and an expiry. Tampered or expired cookies are ignored.
 */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const LINK_TTL_MS = 20 * 60 * 1000;

export const cookieName = () => (process.env.NODE_ENV === "production" ? "__Host-ck_donor" : "ck_donor");

const secret = () => {
  const s = process.env.PAYLOAD_SECRET;
  if (!s) throw new Error("PAYLOAD_SECRET is required for donor sessions");
  return s;
};

const sign = (value: string) => createHmac("sha256", secret()).update(`donor-session:${value}`).digest("base64url");

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export function createSession(email: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ e: normaliseEmail(email), x: now + SESSION_TTL_MS })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSession(cookie: string | undefined | null, now = Date.now()): { email: string } | null {
  if (!cookie) return null;
  const [body, sig] = cookie.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
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
