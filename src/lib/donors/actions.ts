"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasDatabase, payloadClient } from "@/lib/cms";
import { checkFormSignals, clientIp, hashIp, verifyTurnstile } from "@/lib/submissions/antiabuse";
import { layout, send } from "@/lib/submissions/emails";
import type { FormState } from "@/lib/submissions/actions";
import { hasPayments, donorPayments } from "./data";
import { currentDonor, endDonorSession, startDonorSession } from "./server";
import { hashToken, LINK_TTL_MS, newLoginToken, normaliseEmail } from "./session";

const SENT =
  "If an account exists for that address, we have sent a sign-in link. It works once and expires in 20 minutes.";
const LIMITS = { perEmail: 3, perIp: 5, windowMs: 60 * 60 * 1000 };

async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
}

/**
 * Request a sign-in link (PRD addendum A1-1 to A1-4). Always answers the same
 * way, so nobody can learn whether an email address has given.
 */
export async function requestDonorLink(_prev: FormState, form: FormData): Promise<FormState> {
  if (!hasDatabase()) return { status: "error", message: "Donor accounts are not available yet." };

  const signals = checkFormSignals(form);
  if (!signals.ok) {
    if (signals.reason === "honeypot") return { status: "success", message: SENT };
    return {
      status: "error",
      message:
        signals.reason === "too-fast"
          ? "That was very quick. Please take a moment and submit again."
          : "For your security, this form has expired. Please reload the page and try again.",
    };
  }
  const ip = clientIp(await headers());
  if (!(await verifyTurnstile(form, ip))) {
    return { status: "error", message: "Please complete the verification and try again." };
  }

  const parsed = z.string().trim().max(254).email().safeParse(form.get("email"));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      errors: { email: "Please enter the email address you used for your receipt." },
      values: { email: String(form.get("email") ?? "") },
    };
  }
  const email = normaliseEmail(parsed.data);
  const ipHash = hashIp(ip);
  const payload = await payloadClient();
  const since = new Date(Date.now() - LIMITS.windowMs).toISOString();
  const [byEmail, byIp] = await Promise.all([
    payload.count({
      collection: "donor-login-tokens",
      overrideAccess: true,
      where: { and: [{ email: { equals: email } }, { createdAt: { greater_than: since } }] },
    }),
    payload.count({
      collection: "donor-login-tokens",
      overrideAccess: true,
      where: { and: [{ ipHash: { equals: ipHash } }, { createdAt: { greater_than: since } }] },
    }),
  ]);
  if (byIp.totalDocs >= LIMITS.perIp) {
    return {
      status: "error",
      message: "There have been several sign-in requests from this connection. Please try again later.",
    };
  }
  // Same answer whether or not the email is known, or its hourly limit is reached.
  if (byEmail.totalDocs >= LIMITS.perEmail) return { status: "success", message: SENT };
  if (!(await hasPayments(payload, email))) {
    // Record an already-used placeholder so per-connection limits still apply.
    const now = new Date().toISOString();
    await payload.create({
      collection: "donor-login-tokens",
      overrideAccess: true,
      data: { tokenHash: newLoginToken().hash, email, expiresAt: now, usedAt: now, ipHash },
    });
    return { status: "success", message: SENT };
  }

  const { token, hash } = newLoginToken();
  await payload.create({
    collection: "donor-login-tokens",
    overrideAccess: true,
    data: { tokenHash: hash, email, expiresAt: new Date(Date.now() + LINK_TTL_MS).toISOString(), ipHash },
  });
  const link = `${await siteOrigin()}/account/verify?token=${encodeURIComponent(token)}`;
  after(() =>
    send(
      payload,
      email,
      "Your sign-in link: Comfort Kwaw Memorial Fund",
      layout("Sign in to your donor account", [
        "Use the button below to see your payments and receipts. The link works once and expires in 20 minutes.",
        { label: "Sign in", href: link },
        "If you did not ask for this, you can ignore this email.",
      ]),
    ),
  );
  return { status: "success", message: SENT };
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
 * Consume a single-use sign-in link (PRD addendum A1-3, A1-5). Runs only when
 * the donor presses "Continue", never on a plain GET, so email link scanners
 * cannot burn the link. The token is claimed atomically before the session starts.
 */
export async function confirmDonorLink(form: FormData): Promise<void> {
  const token = String(form.get("token") ?? "");
  if (token.length < 32 || token.length > 128 || !hasDatabase()) redirect("/account?expired=1");

  const payload = await payloadClient();
  const { docs } = await payload.find({
    collection: "donor-login-tokens",
    where: { tokenHash: { equals: hashToken(token) } },
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

  await startDonorSession(row.email);
  await payload.create({
    collection: "audit-logs",
    overrideAccess: true,
    data: { actorLabel: `donor:${row.email}`, action: "donor-login", entity: "donor-account" },
  });
  redirect("/account");
}
