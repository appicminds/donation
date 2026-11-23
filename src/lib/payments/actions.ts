"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getSiteSettings, hasDatabase, payloadClient } from "@/lib/cms";
import { clientIp, hashIp } from "@/lib/submissions/antiabuse";
import { missingDisclosures } from "@/payload/rules";
import { newAccessToken, newReceiptRef, tokensMatch, validateHonorAmount, type PaymentStatus } from "./rules";
import { stripe, stripeConfigured } from "./stripe";

export type StartHonorInput = {
  currency: string;
  amount: string;
  name?: string;
  email: string;
  note?: string;
  showName?: boolean;
  /** Generated once per checkout attempt in the browser; makes retries safe. */
  idempotencyKey: string;
};

export type StartHonorResult =
  | { ok: true; clientSecret: string; receiptRef: string; token: string; amountMinor: number; currency: "USD" | "GBP" }
  | { ok: false; message: string; errors?: Record<string, string> };

const UNAVAILABLE = "Online contributions are not open yet. Thank you for your patience and kindness.";
const DUPLICATE =
  "This payment may already have been submitted. Please check your confirmation email before trying again.";
const RATE = 10; // checkout attempts per hour per visitor

const details = z.object({
  name: z.string().trim().max(120, "Please keep your name under 120 characters.").optional(),
  email: z.string().trim().max(254).email("Please enter a valid email address for your receipt."),
  note: z.string().trim().max(500, "Please keep your note under 500 characters.").optional(),
  idempotencyKey: z.string().uuid(),
});

/**
 * Create (or safely resume) a payment (PRD §9.3 steps 6–7). The server
 * validates the amount, currency, limits and launch configuration, records
 * the payment, and creates the Stripe PaymentIntent with an idempotency key.
 * Nothing here marks a payment as paid; only the signed webhook does.
 */
export async function startHonor(input: StartHonorInput): Promise<StartHonorResult> {
  const settings = await getSiteSettings();
  if (
    !hasDatabase() ||
    !stripeConfigured() ||
    !settings.flags.paymentsEnabled ||
    missingDisclosures(settings.disclosures).length
  ) {
    return { ok: false, message: UNAVAILABLE };
  }

  const amount = validateHonorAmount(input.currency, input.amount, settings.currencies, settings.customAmount);
  const parsed = details.safeParse({
    name: input.name || undefined,
    email: input.email,
    note: input.note || undefined,
    idempotencyKey: input.idempotencyKey,
  });
  const errors: Record<string, string> = {};
  if (!amount.ok) errors[amount.field] = amount.message;
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
  if (!amount.ok || !parsed.success) return { ok: false, message: "Please check the highlighted details.", errors };

  const payload = await payloadClient();
  const ipHash = hashIp(clientIp(await headers()));

  // Same attempt resubmitted (double click, network retry): resume it, never create a second payment.
  const { docs: prior } = await payload.find({
    collection: "payments",
    where: { idempotencyKey: { equals: parsed.data.idempotencyKey } },
    overrideAccess: true,
    limit: 1,
    depth: 0,
    showHiddenFields: true,
  });
  if (prior[0]) {
    const p = prior[0];
    if (p.amountMinor !== amount.amountMinor || p.currency !== amount.currency || !p.stripePaymentIntentId) {
      return { ok: false, message: DUPLICATE };
    }
    const pi = await stripe().paymentIntents.retrieve(p.stripePaymentIntentId);
    if (
      !pi.client_secret ||
      !["requires_payment_method", "requires_confirmation", "requires_action"].includes(pi.status)
    ) {
      return { ok: false, message: DUPLICATE };
    }
    return {
      ok: true,
      clientSecret: pi.client_secret,
      receiptRef: p.receiptRef,
      token: p.accessToken,
      amountMinor: p.amountMinor,
      currency: p.currency,
    };
  }

  const recent = await payload.count({
    collection: "payments",
    overrideAccess: true,
    where: {
      and: [
        { ipHash: { equals: ipHash } },
        { createdAt: { greater_than: new Date(Date.now() - 3600_000).toISOString() } },
      ],
    },
  });
  if (recent.totalDocs >= RATE) {
    return {
      ok: false,
      message: "There have been several payment attempts from this connection. Please try again later.",
    };
  }

  const receiptRef = newReceiptRef();
  const token = newAccessToken();
  const payment = await payload.create({
    collection: "payments",
    overrideAccess: true,
    data: {
      receiptRef,
      accessToken: token,
      idempotencyKey: parsed.data.idempotencyKey,
      ipHash,
      status: "created",
      amountMinor: amount.amountMinor,
      currency: amount.currency,
      frequency: "one_time",
      donorEmail: parsed.data.email.toLowerCase(),
      donorName: parsed.data.name,
      showName: Boolean(input.showName),
      memorialNote: parsed.data.note,
      refundedMinor: 0,
    },
  });

  try {
    const pi = await stripe().paymentIntents.create(
      {
        amount: amount.amountMinor,
        currency: amount.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        description: "Honoring the memory of Comfort Kwaw",
        metadata: { paymentId: String(payment.id), receiptRef },
      },
      { idempotencyKey: `pi:${parsed.data.idempotencyKey}` },
    );
    await payload.update({
      collection: "payments",
      id: payment.id,
      overrideAccess: true,
      data: { stripePaymentIntentId: pi.id, status: "requires_payment", livemode: pi.livemode },
    });
    return {
      ok: true,
      clientSecret: pi.client_secret!,
      receiptRef,
      token,
      amountMinor: amount.amountMinor,
      currency: amount.currency,
    };
  } catch (error) {
    console.error("[startHonor] Stripe error", error);
    await payload.update({
      collection: "payments",
      id: payment.id,
      overrideAccess: true,
      data: { status: "failed", failureMessage: "Payment could not be started." },
    });
    return { ok: false, message: "We could not start your payment. Please try again in a moment." };
  }
}

export type HonorStatus = {
  receiptRef: string;
  status: PaymentStatus;
  amountMinor: number;
  currency: "USD" | "GBP";
  refundedMinor: number;
  createdAt: string;
  succeededAt: string | null;
  displayName: string;
};

/**
 * Status for the confirmation and receipt pages. It requires both the
 * reference and the secret token, so nobody can look up other people's
 * payments. Exposes no email, card or processor details.
 */
export async function getHonorStatus(receiptRef: string, token: string): Promise<HonorStatus | null> {
  if (!hasDatabase() || !/^CK-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(receiptRef)) return null;
  const payload = await payloadClient();
  const { docs } = await payload.find({
    collection: "payments",
    where: { receiptRef: { equals: receiptRef } },
    overrideAccess: true,
    limit: 1,
    depth: 0,
    showHiddenFields: true,
  });
  const p = docs[0];
  if (!p || !tokensMatch(p.accessToken, token)) return null;
  return {
    receiptRef: p.receiptRef,
    status: p.status,
    amountMinor: p.amountMinor,
    currency: p.currency,
    refundedMinor: p.refundedMinor ?? 0,
    createdAt: p.createdAt,
    succeededAt: p.succeededAt ?? null,
    displayName: p.showName && p.donorName ? p.donorName : "Anonymous",
  };
}
