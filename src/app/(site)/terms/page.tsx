import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/LegalPage";

export const metadata: Metadata = { title: "Terms of Use" };

/** Terms of Use (PRD §8.4). Structure only; final text requires counsel. */
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" intro="The guidelines for using this memorial website.">
      <h2>Using this website</h2>
      <p>This website exists to remember and honor Comfort Kwaw. Please use it respectfully.</p>
      <h2>Sharing memories and photographs</h2>
      <ul>
        <li>Share only content you have the right and permission to post.</li>
        <li>All messages and photographs are reviewed by the family before they appear, and may be declined.</li>
        <li>
          We may decline content that is abusive, misleading, private or inappropriate, and may remove content at any
          time.
        </li>
      </ul>
      <h2>Still to be confirmed</h2>
      <p>Content licensing, limitations of liability and governing law will be added after legal review.</p>
    </LegalPage>
  );
}
