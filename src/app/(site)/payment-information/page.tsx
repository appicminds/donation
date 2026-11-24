import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/LegalPage";
import { paymentCopy } from "@/content/copy";
import { getSiteSettings } from "@/lib/cms";

export const metadata: Metadata = { title: "Payment Information" };

/**
 * Payment Information (PRD §8.4, §9). Shows the disclosures saved in Site
 * settings (approved wording only). Anything not yet provided is listed as
 * pending, never guessed.
 */
export default async function PaymentInformationPage() {
  const { flags, currencies, disclosures: d } = await getSiteSettings();
  const pending = [
    !d.legalRecipient && "The legal recipient of payments and its classification",
    !d.purposeDisclosure && "The purpose of the fund, as approved",
    !d.refundPolicy && "The refund policy and how to request support",
  ].filter(Boolean) as string[];

  return (
    <LegalPage title="Payment Information" intro="What to know before you honor Comfort Kwaw with a payment.">
      <h2>Current status</h2>
      <p>
        {flags.paymentsEnabled
          ? "Online contributions are open. Payments are processed securely by Stripe; card details never reach the fund's servers."
          : paymentCopy.notYetOpen}
      </p>

      {d.legalRecipient && (
        <>
          <h2>Recipient</h2>
          <p>{d.legalRecipient}</p>
        </>
      )}
      {d.paymentClassification && (
        <>
          <h2>Payment classification</h2>
          <p>{d.paymentClassification}</p>
        </>
      )}
      {d.purposeDisclosure && (
        <>
          <h2>Purpose</h2>
          <p>{d.purposeDisclosure}</p>
        </>
      )}

      <h2>Currencies and fees</h2>
      <p>
        Payments are accepted in{" "}
        {currencies.includes("GBP") ? "US Dollars (USD) or British Pounds (GBP)" : "US Dollars (USD)"}. One-time
        payments only. The fund adds no fees to the amount you choose. {paymentCopy.fxNote}
      </p>

      <h2>Tax status</h2>
      <p>{d.taxStatement} No tax-deductibility is claimed.</p>

      {d.refundPolicy && (
        <>
          <h2>Refunds and support</h2>
          <p>{d.refundPolicy}</p>
        </>
      )}

      {pending.length > 0 && (
        <>
          <h2>To be published before payments open</h2>
          <ul>
            {pending.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </LegalPage>
  );
}
