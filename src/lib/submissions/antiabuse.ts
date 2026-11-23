import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Bot and abuse protection for public forms (PRD §15.1):
 *  - honeypot field that people never see or fill
 *  - signed render timestamp: reject instant or very old submissions
 *  - per-IP rate limit (IP is stored only as a salted hash)
 *  - Cloudflare Turnstile, when keys are configured
 */

export const HONEYPOT_FIELD = "website";
export const STARTED_FIELD = "startedAt";
const MIN_FILL_MS = 3_000;
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

const secret = () => process.env.PAYLOAD_SECRET || "dev-only-insecure-secret";

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

/** Token placed in the form when it renders. */
export function issueFormToken(now = Date.now()): string {
  const ts = String(now);
  return `${ts}.${sign(`form:${ts}`)}`;
}

export type AbuseVerdict = { ok: true } | { ok: false; reason: "honeypot" | "token" | "too-fast" | "expired" };

export function checkFormSignals(form: FormData, now = Date.now()): AbuseVerdict {
  const honeypot = form.get(HONEYPOT_FIELD);
  if (typeof honeypot === "string" && honeypot.trim() !== "") return { ok: false, reason: "honeypot" };

  const token = String(form.get(STARTED_FIELD) ?? "");
  const [ts, sig] = token.split(".");
  if (!ts || !sig || !/^\d+$/.test(ts)) return { ok: false, reason: "token" };
  const expected = Buffer.from(sign(`form:${ts}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "token" };

  const age = now - Number(ts);
  if (age < MIN_FILL_MS) return { ok: false, reason: "too-fast" };
  if (age > MAX_AGE_MS) return { ok: false, reason: "expired" };
  return { ok: true };
}

/** Salted, one-way hash of the client IP, so rate limits work without storing IPs. */
export function hashIp(ip: string | null | undefined): string {
  return createHmac("sha256", secret())
    .update(`ip:${ip ?? "unknown"}`)
    .digest("hex")
    .slice(0, 32);
}

export function clientIp(headers: Headers): string | null {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export const RATE_LIMITS = {
  memory: { max: 5, windowMs: 60 * 60 * 1000 },
  photo: { max: 5, windowMs: 60 * 60 * 1000 },
  contact: { max: 5, windowMs: 60 * 60 * 1000 },
} as const;

export const turnstileEnabled = () =>
  Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

/** Verify a Cloudflare Turnstile token. Skipped (allowed) when Turnstile is not configured. */
export async function verifyTurnstile(form: FormData, ip: string | null): Promise<boolean> {
  if (!turnstileEnabled()) return true;
  const token = form.get("cf-turnstile-response");
  if (typeof token !== "string" || !token) return false;
  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}
