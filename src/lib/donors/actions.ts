"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import type { Payload } from "payload";
import { z } from "zod";
import { hasDatabase, payloadClient } from "@/lib/cms";
import { checkFormSignals, clientIp, hashIp, verifyTurnstile } from "@/lib/submissions/antiabuse";
import { layout, send } from "@/lib/submissions/emails";
import type { FormState } from "@/lib/submissions/actions";
import { donorPayments, ensureDonor, findDonor, hasPayments } from "./data";
import { checkNewPassword, hashPassword, verifyPassword } from "./password";
import {
  clearPendingEmail,
  currentDonor,
  endDonorSession,
  pendingEmail,
  setPendingEmail,
  startDonorSession,
} from "./server";
import {
  codesMatch,
  hashSignInCode,
  hashToken,
  LINK_TTL_MS,
  newLoginToken,
  newSignInCode,
  normaliseEmail,
} from "./session";

const REQUEST_LIMITS = { perEmail: 3, perIp: 5, windowMs: 60 * 60 * 1000 };
const CODE_ATTEMPTS = 5;
const PASSWORD_LOCK = { attempts: 5, ms: 15 * 60 * 1000, perIpPerHour: 10 };
const PASSWORD_FAILED =
  "That email and password don't match. After several wrong attempts, password sign-in pauses for 15 minutes; you can always sign in with an email code instead.";

async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
}

/** Honeypot, timer and Turnstile, shared by the public sign-in forms. `null` means carry on. */
async function guard(form: FormData): Promise<FormState | null> {
  const signals = checkFormSignals(form);
  if (!signals.ok) {
    return {
      status: "error",
      message:
        signals.reason === "too-fast"
          ? "That was very quick. Please take a moment and submit again."
          : "For your security, this form has expired. Please reload the page and try again.",
    };
  }
  if (!(await verifyTurnstile(form, clientIp(await headers())))) {
    return { status: "error", message: "Please complete the verification and try again." };
  }
  return null;
}

const emailField = z.string().trim().max(254).email();

async function audit(payload: Payload, email: string, action: string, summary?: string) {
  await payload.create({
    collection: "audit-logs",
    overrideAccess: true,
    data: { actorLabel: `donor:${email}`, action, entity: "donor-account", summary },
  });
}

/** Mark the donor signed in: session cookie, account record, audit entry. */
async function completeSignIn(payload: Payload, email: string, method: string) {
  const donor = await ensureDonor(payload, email);
  await payload.update({
    collection: "donors",
    id: donor.id,
    overrideAccess: true,
    data: { lastSignInAt: new Date().toISOString() },
  });
  // Any other codes or links still open for this email are spent too.
  await payload.update({
    collection: "donor-login-tokens",
    where: { and: [{ email: { equals: email } }, { kind: { equals: "signin" } }, { usedAt: { exists: false } }] },
    overrideAccess: true,
    data: { usedAt: new Date().toISOString() },
  });
  await startDonorSession(email);
  await clearPendingEmail();
  await audit(payload, email, "donor-login", `Signed in with ${method}`);
}

/**
 * Request a sign-in code (PRD addendum A1-2, A1-4, A1-14). Always leads to the
 * same "enter your code" page, so nobody can learn whether an email has given.
 * Unknown emails get a row with an unsendable code, so wrong guesses behave the same.
 */
export async function requestDonorCode(_prev: FormState, form: FormData): Promise<FormState> {
  if (!hasDatabase()) return { status: "error", message: "Donor accounts are not available yet." };
  if (form.get("website")) redirect("/account/code"); // bots: look like success, do nothing
  const blocked = await guard(form);
  if (blocked) return blocked;

  const parsed = emailField.safeParse(form.get("email"));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      errors: { email: "Please enter the email address you used for your receipt." },
      values: { email: String(form.get("email") ?? "") },
    };
  }
  const email = normaliseEmail(parsed.data);
  const ipHash = hashIp(clientIp(await headers()));
  const payload = await payloadClient();
  const since = new Date(Date.now() - REQUEST_LIMITS.windowMs).toISOString();
  const recent = (field: "email" | "ipHash", value: string) =>
    payload.count({
      collection: "donor-login-tokens",
      overrideAccess: true,
      where: {
        and: [{ [field]: { equals: value } }, { kind: { equals: "signin" } }, { createdAt: { greater_than: since } }],
      },
    });
  const [byEmail, byIp] = await Promise.all([recent("email", email), recent("ipHash", ipHash)]);
  if (byIp.totalDocs >= REQUEST_LIMITS.perIp) {
    return {
      status: "error",
      message: "There have been several sign-in requests from this connection. Please try again later.",
    };
  }
  await setPendingEmail(email);
  // Over the hourly limit: same page, no new code (the latest one still works).
  if (byEmail.totalDocs >= REQUEST_LIMITS.perEmail) redirect("/account/code");

  const known = Boolean(await findDonor(payload, email)) || (await hasPayments(payload, email));

  // A new code replaces any earlier unused one.
  await payload.update({
    collection: "donor-login-tokens",
    where: { and: [{ email: { equals: email } }, { kind: { equals: "signin" } }, { usedAt: { exists: false } }] },
    overrideAccess: true,
    data: { usedAt: new Date().toISOString() },
  });

  const { token, hash } = newLoginToken();
  const code = newSignInCode();
  await payload.create({
    collection: "donor-login-tokens",
    overrideAccess: true,
    data: {
      kind: "signin",
      tokenHash: hash,
      codeHash: hashSignInCode(email, code),
      email,
      expiresAt: new Date(Date.now() + LINK_TTL_MS).toISOString(),
      ipHash,
    },
  });

  if (known) {
    const link = `${await siteOrigin()}/account/verify?token=${encodeURIComponent(token)}`;
    after(() =>
      send(
        payload,
        email,
        `${code} is your sign-in code: Comfort Kwaw Memorial Fund`,
        layout("Your sign-in code", [
          `Your code is ${code}. Enter it on the sign-in page to see your payments and receipts.`,
          "Or use the button below on this device. The code and button work once and expire in 20 minutes.",
          { label: "Sign in", href: link },
          "If you did not ask for this, you can ignore this email. Nobody can sign in without the code.",
        ]),
      ),
    );
  }
  redirect("/account/code");
}

/** Check an emailed code (A1-14): five tries, single use, 20 minutes. */
export async function verifyDonorCode(_prev: FormState, form: FormData): Promise<FormState> {
  if (!hasDatabase()) return { status: "error", message: "Donor accounts are not available yet." };
  const email = await pendingEmail();
  if (!email) redirect("/account?expired=1");
  const blocked = await guard(form);
  if (blocked) return blocked;

  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      errors: { code: "Enter the 6-digit code from the email." },
    };
  }

  const payload = await payloadClient();
  const { docs } = await payload.find({
    collection: "donor-login-tokens",
    where: {
      and: [
        { email: { equals: email } },
        { kind: { equals: "signin" } },
        { usedAt: { exists: false } },
        { expiresAt: { greater_than: new Date().toISOString() } },
      ],
    },
    sort: "-createdAt",
    overrideAccess: true,
    limit: 1,
    depth: 0,
  });
  const row = docs[0];
  const expired = {
    status: "error" as const,
    message: "This code has expired or has been used. Please request a new one.",
  };
  if (!row) return expired;

  if (!codesMatch(row.codeHash, email, code)) {
    const attempts = (row.codeAttempts ?? 0) + 1;
    const spent = attempts >= CODE_ATTEMPTS;
    await payload.update({
      collection: "donor-login-tokens",
      id: row.id,
      overrideAccess: true,
      data: { codeAttempts: attempts, ...(spent ? { usedAt: new Date().toISOString() } : {}) },
    });
    if (spent) {
      return { status: "error", message: "Too many wrong attempts. Please request a new code." };
    }
    const left = CODE_ATTEMPTS - attempts;
    return {
      status: "error",
      message: `That code isn't right. You have ${left} ${left === 1 ? "try" : "tries"} left.`,
      errors: { code: "Check the code and try again." },
    };
  }

  const { docs: claimed } = await payload.update({
    collection: "donor-login-tokens",
    where: { and: [{ id: { equals: row.id } }, { usedAt: { exists: false } }] },
    overrideAccess: true,
    data: { usedAt: new Date().toISOString() },
  });
  if (claimed.length !== 1) return expired;

  const donor = await findDonor(payload, email);
  await completeSignIn(payload, email, "an email code");
  redirect(donor?.passwordHash ? "/account" : "/account?welcome=1");
}

/** Email and password (A1-16). Failures never say which part was wrong. */
export async function signInWithPassword(_prev: FormState, form: FormData): Promise<FormState> {
  if (!hasDatabase()) return { status: "error", message: "Donor accounts are not available yet." };
  const blocked = await guard(form);
  if (blocked) return blocked;

  const parsed = emailField.safeParse(form.get("email"));
  const password = String(form.get("password") ?? "");
  if (!parsed.success || !password) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      errors: {
        ...(parsed.success ? {} : { email: "Please enter your email address." }),
        ...(password ? {} : { password: "Please enter your password." }),
      },
      values: { email: String(form.get("email") ?? "") },
    };
  }
  const email = normaliseEmail(parsed.data);
  const ipHash = hashIp(clientIp(await headers()));
  const payload = await payloadClient();

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const failuresFromIp = await payload.count({
    collection: "donor-login-tokens",
    overrideAccess: true,
    where: {
      and: [
        { ipHash: { equals: ipHash } },
        { kind: { equals: "password-failure" } },
        { createdAt: { greater_than: since } },
      ],
    },
  });
  if (failuresFromIp.totalDocs >= PASSWORD_LOCK.perIpPerHour) {
    return {
      status: "error",
      message: "Too many attempts from this connection. Please try again later, or sign in with an email code.",
      values: { email },
    };
  }

  const donor = await findDonor(payload, email);
  const locked = Boolean(donor?.passwordLockedUntil && Date.parse(donor.passwordLockedUntil) > Date.now());
  const ok = (await verifyPassword(password, donor?.passwordHash)) && !locked;

  if (!ok || !donor) {
    const now = new Date().toISOString();
    await payload.create({
      collection: "donor-login-tokens",
      overrideAccess: true,
      data: { kind: "password-failure", tokenHash: newLoginToken().hash, email, expiresAt: now, usedAt: now, ipHash },
    });
    if (donor && !locked) {
      const attempts = (donor.failedPasswordAttempts ?? 0) + 1;
      const lock = attempts >= PASSWORD_LOCK.attempts;
      await payload.update({
        collection: "donors",
        id: donor.id,
        overrideAccess: true,
        data: lock
          ? { failedPasswordAttempts: 0, passwordLockedUntil: new Date(Date.now() + PASSWORD_LOCK.ms).toISOString() }
          : { failedPasswordAttempts: attempts },
      });
      if (lock) await audit(payload, email, "donor-password-locked", "Password sign-in paused for 15 minutes");
    }
    return { status: "error", message: PASSWORD_FAILED, values: { email } };
  }

  await payload.update({
    collection: "donors",
    id: donor.id,
    overrideAccess: true,
    data: { failedPasswordAttempts: 0, passwordLockedUntil: null },
  });
  await completeSignIn(payload, email, "a password");
  redirect("/account");
}

/** Set or change the optional password (A1-15). Needs a signed-in donor. */
export async function setDonorPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await currentDonor();
  if (!session) redirect("/account");
  const password = String(form.get("password") ?? "");
  const problem = checkNewPassword(password, String(form.get("confirm") ?? ""), session.email);
  if (problem) {
    return { status: "error", message: "Please check the highlighted fields.", errors: { password: problem } };
  }
  const payload = await payloadClient();
  const donor = await ensureDonor(payload, session.email);
  const changing = Boolean(donor.passwordHash);
  await payload.update({
    collection: "donors",
    id: donor.id,
    overrideAccess: true,
    data: {
      passwordHash: await hashPassword(password),
      passwordSetAt: new Date().toISOString(),
      failedPasswordAttempts: 0,
      passwordLockedUntil: null,
    },
  });
  await audit(payload, session.email, "donor-password", changing ? "Password changed" : "Password set");
  redirect(`/account?saved=${changing ? "password-changed" : "password-set"}`);
}

export async function removeDonorPassword(): Promise<void> {
  const session = await currentDonor();
  if (!session) redirect("/account");
  const payload = await payloadClient();
  const donor = await findDonor(payload, session.email);
  if (donor?.passwordHash) {
    await payload.update({
      collection: "donors",
      id: donor.id,
      overrideAccess: true,
      data: { passwordHash: null, passwordSetAt: null },
    });
    await audit(payload, session.email, "donor-password", "Password removed");
  }
  redirect("/account?saved=password-removed");
}

/** Turn public display of the donor's name on or off for all their payments (A1-7). */
export async function setNameDisplay(form: FormData): Promise<void> {
  const donor = await currentDonor();
  if (!donor) redirect("/account");
  const show = form.get("showName") === "on";
  const payload = await payloadClient();
  const mine = await donorPayments(payload, donor.email);
  for (const p of mine) {
    if (Boolean(p.showName) !== show) {
      await payload.update({ collection: "payments", id: p.id, overrideAccess: true, data: { showName: show } });
    }
  }
  await payload.create({
    collection: "audit-logs",
    overrideAccess: true,
    data: {
      actorLabel: `donor:${donor.email}`,
      action: "consent",
      entity: "payments",
      summary: `Public name display ${show ? "allowed" : "withdrawn"} for ${mine.length} payment(s)`,
    },
  });
  redirect("/account?saved=1");
}

export async function signOutDonor(): Promise<void> {
  await endDonorSession();
  redirect("/account?signedOut=1");
}

/**
 * Consume the one-tap link from the sign-in email (A1-3, A1-5). Runs only when
 * the donor presses "Continue", never on a plain GET, so email link scanners
 * cannot burn it. The row is claimed atomically, which also spends its code.
 */
export async function confirmDonorLink(form: FormData): Promise<void> {
  const token = String(form.get("token") ?? "");
  if (token.length < 32 || token.length > 128 || !hasDatabase()) redirect("/account?expired=1");

  const payload = await payloadClient();
  const { docs } = await payload.find({
    collection: "donor-login-tokens",
    where: { and: [{ tokenHash: { equals: hashToken(token) } }, { kind: { equals: "signin" } }] },
    overrideAccess: true,
    limit: 1,
    depth: 0,
  });
  const row = docs[0];
  if (!row) redirect("/account?expired=1");

  // Pressing the button twice: already signed in as this donor, so carry on.
  const already = await currentDonor();
  if (row.usedAt && already?.email === row.email) redirect("/account");
  if (row.usedAt || Date.parse(row.expiresAt) < Date.now()) redirect("/account?expired=1");

  const { docs: claimed } = await payload.update({
    collection: "donor-login-tokens",
    where: { and: [{ id: { equals: row.id } }, { usedAt: { exists: false } }] },
    overrideAccess: true,
    data: { usedAt: new Date().toISOString() },
  });
  if (claimed.length !== 1) redirect("/account?expired=1");

  const donor = await findDonor(payload, row.email);
  await completeSignIn(payload, row.email, "an email link");
  redirect(donor?.passwordHash ? "/account" : "/account?welcome=1");
}
