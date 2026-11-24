import type { Payload } from "payload";
import { formatMoney } from "@/lib/money";
import { layout, send } from "@/lib/submissions/emails";
import type { Payment } from "@/payload-types";
import { paymentLinks } from "./links";

const TAX_FOOTER =
  "This is a payment confirmation, not a charitable tax receipt unless separately stated by an eligible organization.";

const when = (iso?: string | null) =>
  new Date(iso ?? Date.now()).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }) +
  " UTC";

const receiptButton = (p: Payment) => {
  const links = paymentLinks(p);
  return links ? [{ label: "View or download your receipt", href: links.receipt }] : [];
};
const statusButton = (p: Payment) => {
  const links = paymentLinks(p);
  return links ? [{ label: "View your payment status", href: links.confirmation }] : [];
};

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
      ...receiptButton(p),
      "You can see all your payments and receipts at any time in your donor account: sign in on our website with this email address (Donor account, in the footer).",
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
      ...statusButton(p),
    ]),
  );
}
