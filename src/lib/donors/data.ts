import type { Payload } from "payload";
import type { Payment } from "@/payload-types";
import { tokensMatch } from "@/lib/payments/rules";
import { normaliseEmail } from "./session";

/**
 * A donor's own payments, matched on the exact (case-insensitive) receipt
 * email. `like` narrows the query in the database, then an exact comparison
 * makes sure nobody ever sees another person's payments.
 */
export async function donorPayments(payload: Payload, email: string): Promise<Payment[]> {
  const wanted = normaliseEmail(email);
  const { docs } = await payload.find({
    collection: "payments",
    where: { donorEmail: { like: wanted } },
    overrideAccess: true,
    pagination: false,
    depth: 0,
    sort: "-createdAt",
    showHiddenFields: true,
  });
  return docs.filter((p) => p.donorEmail && normaliseEmail(p.donorEmail) === wanted);
}

export async function hasPayments(payload: Payload, email: string): Promise<boolean> {
  return (await donorPayments(payload, email)).length > 0;
}

export type DonorRecord = {
  id: number | string;
  email: string;
  name?: string | null;
  passwordHash?: string | null;
  failedPasswordAttempts?: number | null;
  passwordLockedUntil?: string | null;
};

export async function findDonor(payload: Payload, email: string): Promise<DonorRecord | null> {
  const { docs } = await payload.find({
    collection: "donors",
    where: { email: { equals: normaliseEmail(email) } },
    overrideAccess: true,
    limit: 1,
    depth: 0,
  });
  return (docs[0] as DonorRecord | undefined) ?? null;
}

/** The donor account for an email, created on first payment or sign-in (A1-12). Safe to call repeatedly. */
export async function ensureDonor(payload: Payload, email: string, name?: string | null): Promise<DonorRecord> {
  const existing = await findDonor(payload, email);
  if (existing) return existing;
  try {
    return (await payload.create({
      collection: "donors",
      overrideAccess: true,
      data: { email: normaliseEmail(email), name: name || undefined },
    })) as DonorRecord;
  } catch (error) {
    // Two requests at once: the unique email index lets only one create win.
    const raced = await findDonor(payload, email);
    if (raced) return raced;
    throw error;
  }
}

/**
 * The receipt email for a payment, given its reference and secret token (the
 * pair in every receipt link). Used only to pre-fill the sign-in form (A1-13).
 */
export async function emailForReceipt(payload: Payload, receiptRef: string, token: string): Promise<string | null> {
  if (!/^CK-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(receiptRef) || !token) return null;
  const { docs } = await payload.find({
    collection: "payments",
    where: { receiptRef: { equals: receiptRef } },
    overrideAccess: true,
    limit: 1,
    depth: 0,
    showHiddenFields: true,
  });
  const p = docs[0];
  return p?.donorEmail && tokensMatch(p.accessToken, token) ? normaliseEmail(p.donorEmail) : null;
}
