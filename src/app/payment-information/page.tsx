import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/LegalPage";
import { paymentCopy } from "@/content/copy";

export const metadata: Metadata = { title: "Payment Information" };

/**
 * Payment Information (PRD §8.4, §9). Recipient, classification, fees and
 * refund policy are unknown until Gates B and C, so they are marked pending
 * rather than guessed.
 */
export default function PaymentInformationPage() {
  return (
    <LegalPage title="Payment Information" intro="What to know before you honor Comfort Kwaw with a payment.">
      <h2>Current status</h2>
      <p>{paymentCopy.notYetOpen}</p>
      <h2>Currencies</h2>
      <p>Payments will be accepted in US Dollars (USD), with British Pounds (GBP) as an option. {paymentCopy.fxNote}</p>
      <h2>Tax status</h2>
      <p>
        A payment confirmation from this website is not a charitable tax receipt unless separately stated by an eligible
        organization. No tax-deductibility is claimed.
      </p>
      <h2>To be published before payments open</h2>
      <ul>
        <li>The legal recipient of payments and its classification</li>
        <li>The purpose of the fund, as approved</li>
        <li>Any fees that apply</li>
        <li>Whether payments are one-time or recurring</li>
        <li>The refund policy and how to request support</li>
      </ul>
    </LegalPage>
  );
}
