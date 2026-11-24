import { randomBytes, timingSafeEqual } from "node:crypto";
import { isCurrency, PRESET_AMOUNTS, type Currency } from "@/lib/money";

/**
 * Payment rules (PRD §9). Pure functions shared by the checkout action, the
 * webhook and unit tests.
 */

export type AmountLimits = { min: number; max: number };

export type AmountCheck =
  { ok: true; amountMinor: number; currency: Currency } | { ok: false; field: "currency" | "amount"; message: string };

/**
 * Server-side amount validation (PRD §9.4, §16.2). The browser's amount is
 * never trusted. It must be a supported, enabled currency and either a preset
 * or a custom value within the configured limits, with at most two decimals.
 */
export function validateHonorAmount(
  rawCurrency: unknown,
  rawAmount: unknown,
  enabled: readonly Currency[],
  limits: AmountLimits,
): AmountCheck {
  if (!isCurrency(rawCurrency) || !enabled.includes(rawCurrency)) {
    return {
      ok: false,
      field: "currency",
      message:
        "This payment method is not available for the selected currency. Please choose another supported method or try USD.",
    };
  }
  const text = String(rawAmount ?? "").trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) {
    return {
      ok: false,
      field: "amount",
      message: "Please enter an amount using numbers only, with no more than two decimal places.",
    };
  }
  const [whole, frac = ""] = text.split(".");
  const amountMinor = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  const isPreset = PRESET_AMOUNTS[rawCurrency].some((p) => p * 100 === amountMinor);
  if (!isPreset && (amountMinor < limits.min * 100 || amountMinor > limits.max * 100)) {
    const sym = rawCurrency === "USD" ? "$" : "£";
    return {
      ok: false,
      field: "amount",
      message: `Please enter an amount between ${sym}${limits.min.toLocaleString("en-US")} and ${sym}${limits.max.toLocaleString("en-US")}.`,
    };
  }
  if (amountMinor <= 0) return { ok: false, field: "amount", message: "Please enter an amount greater than zero." };
  return { ok: true, amountMinor, currency: rawCurrency };
}

export const PAYMENT_STATUSES = [
  "created",
  "requires_payment",
  "processing",
  "succeeded",
  "failed",
  "canceled",
  "partially_refunded",
  "refunded",
  "disputed",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * Ledger state machine. Webhooks can arrive late, twice or out of order, so a
 * transition is applied only if it moves the payment forward. For example,
 * "processing" never overwrites "succeeded", and a late failure never
 * overwrites a success.
 */
const RANK: Record<PaymentStatus, number> = {
  created: 0,
  requires_payment: 1,
  processing: 2,
  failed: 3,
  canceled: 3,
  succeeded: 4,
  partially_refunded: 5,
  refunded: 6,
  disputed: 7,
};

export function nextStatus(current: PaymentStatus, incoming: PaymentStatus): PaymentStatus {
  // A failed attempt can be retried on the same intent and then succeed.
  if (current === "failed" && (incoming === "processing" || incoming === "requires_payment")) return incoming;
  // A dispute that closes returns the payment to its refund state (computed by the caller).
  if (
    current === "disputed" &&
    (incoming === "succeeded" || incoming === "refunded" || incoming === "partially_refunded")
  ) {
    return incoming;
  }
  return RANK[incoming] > RANK[current] ? incoming : current;
}

/** Refund status from Stripe's cumulative refunded amount. */
export function refundStatus(amountMinor: number, refundedMinor: number): PaymentStatus {
  if (refundedMinor <= 0) return "succeeded";
  return refundedMinor >= amountMinor ? "refunded" : "partially_refunded";
}

/** Human-friendly receipt reference, e.g. CK-7F3K-9Q2M (no 0/O/1/I to avoid misreading). */
export function newReceiptRef(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(8);
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
  return `CK-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/** Unguessable token that, together with the reference, unlocks the confirmation and receipt pages. */
export function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export function tokensMatch(expected: string | null | undefined, given: string | null | undefined): boolean {
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}
