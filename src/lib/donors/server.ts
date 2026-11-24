import "server-only";
import { cookies } from "next/headers";
import {
  cookieName,
  createPending,
  createSession,
  LINK_TTL_MS,
  pendingCookieName,
  readPending,
  readSession,
  SESSION_TTL_MS,
} from "./session";

// Deliberately NOT a "use server" module: these must never be callable from the browser.

export async function currentDonor(): Promise<{ email: string } | null> {
  return readSession((await cookies()).get(cookieName())?.value);
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
});

export async function startDonorSession(email: string): Promise<void> {
  (await cookies()).set(cookieName(), createSession(email), { ...cookieOptions(), maxAge: SESSION_TTL_MS / 1000 });
}

/**
 * Clear the session. A `__Host-` cookie can only be overwritten with the same
 * Secure/Path attributes, so a plain delete() would be ignored by the browser.
 */
export async function endDonorSession(): Promise<void> {
  (await cookies()).set(cookieName(), "", { ...cookieOptions(), maxAge: 0 });
}

/** The email a sign-in code was just sent to (or requested for), if any. */
export async function pendingEmail(): Promise<string | null> {
  return readPending((await cookies()).get(pendingCookieName())?.value)?.email ?? null;
}

export async function setPendingEmail(email: string): Promise<void> {
  (await cookies()).set(pendingCookieName(), createPending(email), { ...cookieOptions(), maxAge: LINK_TTL_MS / 1000 });
}

export async function clearPendingEmail(): Promise<void> {
  (await cookies()).set(pendingCookieName(), "", { ...cookieOptions(), maxAge: 0 });
}
