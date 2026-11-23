/**
 * Site-wide copy and configuration.
 *
 * Temporary home for content until the CMS lands (PLAN.md M1/M2). Strings are
 * taken verbatim from the PRD. Anything not yet verified by the family or
 * counsel is either left out or marked as pending, and never invented.
 */

export const site = {
  name: "Comfort Kwaw Memorial Fund",
  shortName: "Comfort Kwaw",
  tagline: "Forever Comfort — An Eternal Legacy",
  primaryCta: { label: "Honor Comfort Kwaw", href: "/honor" },
  /** Verified support email. PRD §7.9: do not publish a placeholder address. */
  supportEmail: null as string | null,
  /** Only verified official profiles (PRD §7.9). */
  social: [] as { label: string; href: string }[],
  /** Official legal entity wording, pending counsel (PRD §19). */
  legalEntity: null as string | null,
} as const;

export type NavItem = { label: string; href: string };

/** Global navigation labels from the source brief (PRD §5). */
export const mainNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Her Eternal Legacy", href: "/legacy" },
  { label: "Honor Comfort", href: "/honor" },
  { label: "Memories", href: "/memories" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

/** Footer legal links (PRD §5.1, §7.9). */
export const legalNav: NavItem[] = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Payment Information", href: "/payment-information" },
  { label: "Accessibility", href: "/accessibility" },
  { label: "Donor account", href: "/account" },
];

export const portrait = {
  src: "/images/comfort-portrait.webp",
  width: 1600,
  height: 1200,
  alt: "Portrait of Comfort Kwaw wearing a pink head wrap and patterned lilac dress, looking down gently, framed by warm golden light and roses.",
  /**
   * Client-supplied portrait. The owner approved it for test and staging.
   * Family confirmation of identity, rights and final crop is still required
   * before production (PRD Gate A).
   */
  approval: "staging-only" as "staging-only" | "approved",
};
