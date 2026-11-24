/**
 * Pure business rules shared by Payload hooks and unit tests. Each returns an
 * error message, or null when the change is allowed.
 */
import { hasRole, type Role } from "./roles";

type User = { id: string | number; roles?: readonly string[] | null } | null | undefined;

export const MODERATION_STATUSES = ["pending", "approved", "rejected", "hidden", "removed"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

/** PRD §11.2, §16.3: nothing is published without explicit public-display consent. */
export function checkMemoryApproval(next: { status?: string; publicConsent?: boolean | null }): string | null {
  if (next.status === "approved" && !next.publicConsent) {
    return "This message cannot be approved: the submitter did not give permission for public display.";
  }
  return null;
}

/**
 * PRD §20.6, §11.1: media goes public only with confirmed rights and alt text.
 * A visitor's photo also needs the visitor's own public-display consent.
 */
export function checkMediaApproval(next: {
  approvalStatus?: string;
  rightsConfirmed?: boolean | null;
  alt?: string | null;
  origin?: string | null;
  visitorConsent?: boolean | null;
}): string | null {
  if (next.approvalStatus !== "approved") return null;
  if (next.origin === "visitor" && !next.visitorConsent) {
    return "This photograph cannot be approved: the visitor did not give permission for public display.";
  }
  if (!next.rightsConfirmed) return "Confirm usage rights before approving this image.";
  if (!next.alt?.trim()) return "Add alt text before approving this image.";
  return null;
}

/** PRD §12.4: only publishers may publish. Editors save drafts. */
export function checkPublish(user: User, status: string | undefined, extraRoles: Role[] = []): string | null {
  if (status !== "published") return null;
  if (hasRole(user, "publisher", ...extraRoles)) return null;
  return "You can save drafts, but publishing requires a publisher.";
}

export type PaymentsSwitchState = {
  paymentsEnabled?: boolean | null;
  paymentsEnableRequestedBy?: string | number | { id: string | number } | null;
};

const idOf = (v: PaymentsSwitchState["paymentsEnableRequestedBy"]) => (v && typeof v === "object" ? v.id : (v ?? null));

/**
 * Two-person rule for switching payments on (PRD §4.1, §18). The first super
 * admin's request is recorded. A *different* super admin must then confirm.
 * Switching payments off is always allowed immediately.
 *
 * With Stripe TEST keys no real money can move, so on a test site one super
 * admin may switch payments on directly. Live keys always need two people.
 */
export function resolvePaymentsSwitch(
  previous: PaymentsSwitchState,
  requested: PaymentsSwitchState,
  userId: string | number,
  options: { stripeTestMode?: boolean } = {},
): { paymentsEnabled: boolean; paymentsEnableRequestedBy: string | number | null; message: string | null } {
  const wasOn = Boolean(previous.paymentsEnabled);
  const wantsOn = Boolean(requested.paymentsEnabled);
  const pendingBy = idOf(previous.paymentsEnableRequestedBy);

  if (!wantsOn) return { paymentsEnabled: false, paymentsEnableRequestedBy: null, message: null };
  if (wasOn) return { paymentsEnabled: true, paymentsEnableRequestedBy: null, message: null };
  if (options.stripeTestMode) return { paymentsEnabled: true, paymentsEnableRequestedBy: null, message: null };
  if (pendingBy !== null && String(pendingBy) !== String(userId)) {
    return { paymentsEnabled: true, paymentsEnableRequestedBy: null, message: null };
  }
  return {
    paymentsEnabled: false,
    paymentsEnableRequestedBy: userId,
    message: "Request recorded. A second super administrator must confirm before payments are switched on.",
  };
}

const DISCLOSURES = {
  legalRecipient: "legal recipient",
  paymentClassification: "payment classification",
  purposeDisclosure: "purpose disclosure",
  taxStatement: "tax status statement",
  refundPolicy: "refund policy",
} as const;

/** PRD §8.2: recipient, classification, tax status and refund terms must be visible before payment. */
export function missingDisclosures(settings: Partial<Record<keyof typeof DISCLOSURES, string | null>>): string[] {
  return Object.entries(DISCLOSURES)
    .filter(([key]) => !settings[key as keyof typeof DISCLOSURES]?.trim())
    .map(([, label]) => label);
}
