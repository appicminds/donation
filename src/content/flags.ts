/**
 * Launch flags (PLAN.md §3). Each gated feature checks its flag and falls
 * back to a safe state. These move into the admin settings in M2, where only
 * a super-admin can change them and every change is audited.
 */
export const flags = {
  /** Gates B–D: legal, processor and production approvals recorded. */
  paymentsEnabled: false,
  /** GBP as a second currency, pending processor approval. */
  gbpEnabled: true,
  /** Monthly honoring stays OFF until legal and processor approval (PRD §9.5). */
  recurringEnabled: false,
  /** "The Purpose Behind Her Legacy" wording, approved by family, counsel and processor (PRD §7.4). */
  missionCopyApproved: false,
  /** Visitor memory and photo submissions (M3), once moderators are assigned. */
  memorySubmissionsEnabled: false,
  photoSubmissionsEnabled: false,
  /** Contact form (M3), once a verified support inbox exists. */
  contactFormEnabled: false,
} as const;

export type Flags = typeof flags;
