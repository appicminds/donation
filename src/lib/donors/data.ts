import type { Payload } from "payload";
import type { Payment } from "@/payload-types";
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
