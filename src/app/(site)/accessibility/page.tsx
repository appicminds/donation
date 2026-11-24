import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/ui/LegalPage";

export const metadata: Metadata = { title: "Accessibility" };

/** Accessibility statement (PRD §8.4, §15.3). */
export default function AccessibilityPage() {
  return (
    <LegalPage title="Accessibility" intro="We want everyone to be able to remember and honor Comfort." draft={false}>
      <h2>Our commitment</h2>
      <p>
        We aim for this website to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. We test with
        keyboard navigation, screen readers and automated checks, and we respect your device’s reduced-motion settings.
      </p>
      <h2>What we’ve done</h2>
      <ul>
        <li>All features can be used with a keyboard, and focus is always visible.</li>
        <li>Images have text descriptions, and decorative images are hidden from screen readers.</li>
        <li>Text and controls are designed to meet contrast requirements on both dark and light backgrounds.</li>
        <li>There is no autoplaying sound or video.</li>
      </ul>
      <h2>Known limitations</h2>
      <p>Some features are still being built. We will update this page as they become available.</p>
      <h2>Need help?</h2>
      <p>
        If anything on this website is difficult to use, please <Link href="/contact">contact us</Link> and we will
        help.
      </p>
    </LegalPage>
  );
}
