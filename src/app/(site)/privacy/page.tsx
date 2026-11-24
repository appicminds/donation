import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

/** Privacy Policy (PRD §8.4, §15.2). Structure only; final text requires counsel. */
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" intro="How we handle the information you share with this memorial.">
      <h2>Our approach</h2>
      <p>
        We collect only the information needed to accept payments, send receipts, review shared memories and
        photographs, and answer your messages. Your name, message, photograph and any payment amount are never shown
        publicly without your explicit permission.
      </p>
      <h2>Information we collect</h2>
      <ul>
        <li>
          Payments: your email address for a digital receipt, and any optional details you choose to give. Card details
          are handled by our payment processor and are never stored on our servers.
        </li>
        <li>
          Memories and photographs: what you submit, and whether you have given permission for it to appear publicly
          after review.
        </li>
        <li>Contact messages: your name, email address, topic and message.</li>
      </ul>
      <h2>Your choices</h2>
      <ul>
        <li>Contributions are private by default. Public display requires a separate opt-in.</li>
        <li>You may ask us to remove a message or photograph you shared.</li>
        <li>You may contact us about the information we hold about you.</li>
      </ul>
      <h2>Still to be confirmed</h2>
      <p>
        The data controller, processors, retention periods, cookie use and contact details for privacy requests will be
        added once confirmed.
      </p>
    </LegalPage>
  );
}
