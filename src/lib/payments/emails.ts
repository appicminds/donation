import type { Payload } from "payload";
import { formatMoney } from "@/lib/money";
import { layout, send } from "@/lib/submissions/emails";
import type { Payment } from "@/payload-types";

const TAX_FOOTER =
  "This is a payment confirmation, not a charitable tax receipt unless separately stated by an eligible organization.";

const when = (iso?: string | null) =>
  new Date(iso ?? Date.now()).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }) +
  " UTC";

/** PRD §10.3: "Thank You for Honoring Comfort Kwaw", with amount, currency, date and receipt number. */
export async function sendReceiptEmail(payload: Payload, p: Payment) {
  if (!p.donorEmail) return;
  const amount = formatMoney({ amountMinor: p.amountMinor, currency: p.currency });
  await send(
    payload,
    p.donorEmail,
    "Thank You for Honoring Comfort Kwaw",
    layout("Thank you for honoring Comfort", [
      "Thank you for honoring the memory of Comfort Kwaw. Your kindness and love mean so much to our family.",
      `Amount: ${amount} ${p.currency}`,
      `Date: ${when(p.succeededAt)}`,
      `Receipt number: ${p.receiptRef}`,
      TAX_FOOTER,
    ]),
  );
}

/** PRD §9.7, §10.3: refund confirmation with amount, currency, receipt number and timing. */
export async function sendRefundEmail(payload: Payload, p: Payment, amountMinor: number) {
  if (!p.donorEmail) return;
  const amount = formatMoney({ amountMinor, currency: p.currency });
  await send(
    payload,
    p.donorEmail,
    "Your refund has been initiated",
    layout("Your refund has been initiated", [
      `A refund of ${amount} ${p.currency} has been initiated for receipt ${p.receiptRef}. The time it takes to appear depends on your payment provider.`,
    ]),
  );
}
