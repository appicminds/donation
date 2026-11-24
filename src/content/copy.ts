/**
 * Page copy, taken verbatim from the PRD where the PRD supplies it.
 *
 * `pending` marks concept copy that the PRD lists as needing family (or legal)
 * approval. It may be shown on staging. Before launch it must be approved,
 * or removed by the CMS approval workflow (M2).
 */

export const home = {
  remembering: {
    eyebrow: "Remembering Comfort",
    title: "A Life of Grace, Love and Kindness", // pending: family approval (PRD §7.2)
    body: "Comfort Kwaw will forever be remembered with love and gratitude. Through the memories shared by family, friends, and all those whose lives she touched, her light continues to shine.",
    cta: { label: "Read Her Story", href: "/legacy" },
  },
  legacy: {
    eyebrow: "Her Eternal Legacy",
    title: "A Legacy That Continues to Inspire", // pending: family approval (PRD §7.3)
    body: "Comfort Kwaw was deeply loved and will always hold a special place in the hearts of her family and those who knew her. We remember her with gratitude, honor her with love, and cherish the moments that made her life so meaningful.",
    cta: { label: "Read Her Story", href: "/legacy" },
  },
  purpose: {
    eyebrow: "The Purpose Behind Her Legacy",
    title: "Turning Love Into Hope", // pending: proposed concept headline (PRD §7.4)
    /**
     * Shown only when flags.missionCopyApproved is true. Concept wording from
     * the approved design. It must be replaced by the statement that family,
     * counsel and the processor approve.
     */
    body: "In remembering Comfort, her family hopes to create something meaningful beyond memories. Her legacy inspires a commitment to helping deserving individuals and families facing difficult medical circumstances, so that others may find hope and support when they need it most.",
    cta: { label: "Be Part of Her Legacy", href: "/honor" },
  },
  honor: {
    title: "Honor Her Memory",
    body: "Honor the memory of Comfort Kwaw with a heartfelt gift. Every expression of love and remembrance is deeply appreciated.",
    cta: "Honor Comfort Kwaw",
  },
  memories: {
    title: "Memories & Messages",
    body: "Share a cherished memory, a kind word, or a heartfelt message as we remember Comfort together.",
    empty: "Messages of love and remembrance will appear here.",
    cta: { label: "Share Your Memory", href: "/memories#share" },
  },
  gallery: {
    title: "Photo Gallery",
    body: "A collection of meaningful moments celebrating the life of Comfort Kwaw.",
    empty: "Photographs and memories will be added with the family’s permission.",
    cta: { label: "View Photo Gallery", href: "/gallery" },
  },
  finalCta: {
    title: "Forever Comfort. Forever Loved.",
    body: "Join us in remembering a remarkable woman whose love will always remain with us.",
  },
} as const;

export const legacyPage = {
  title: "Her Eternal Legacy",
  opening: "A life of love, faith, and grace. A memory treasured forever.",
  story:
    "Comfort Kwaw was deeply loved and will always hold a special place in the hearts of her family and those who knew her. We remember her with gratitude, honor her with love, and cherish the moments that made her life so meaningful.",
  closing:
    "Though we miss her presence, the love she shared remains part of us. Forever Comfort. Forever loved. Forever remembered.",
} as const;

/** PRD §9.6 payment display copy. */
export const paymentCopy = {
  currencyLabel: "Choose your currency",
  currencyHelp:
    "Select the currency you would like to pay in. Your bank or card issuer may apply its own exchange rate or fees.",
  globalWelcome: "Wherever you are in the world, you are welcome to honor the memory of Comfort Kwaw.",
  amountLabel: "Choose an amount to honor Comfort Kwaw",
  customAmount: "Enter your amount",
  fxNote:
    "The amount shown is the amount requested in your selected currency. Your bank may apply conversion or international transaction charges.",
  notYetOpen:
    "Online contributions will open once the fund’s legal and payment arrangements are confirmed. Thank you for your patience and kindness.",
} as const;

export const memoriesPage = {
  title: "Messages of Love",
  intro: "Share a cherished memory, a kind word, or a heartfelt message as we remember Comfort together.",
  moderation:
    "Messages and photographs are reviewed before publication. Please share only content you have permission to post. We may decline content that is abusive, misleading, private, or inappropriate.",
  notYetOpen: "Memory sharing will open soon. Thank you for your patience as the family prepares this space.",
} as const;

export const galleryPage = {
  title: "Treasured Memories",
  intro: "A collection of meaningful moments celebrating the life of Comfort Kwaw.",
} as const;

export const contactPage = {
  title: "Connect With the Family",
  intro: "For questions about the memorial website or a payment, please send us a message using the form below.",
  notYetOpen: "The contact form will open soon. Thank you for your patience.",
} as const;
