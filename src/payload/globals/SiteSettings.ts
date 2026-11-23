import { APIError, type Field, type GlobalConfig } from "payload";
import { auditGlobalChange } from "../audit";
import { revalidateCms } from "../revalidate";
import { hasRole, isStaff, isSuperAdmin } from "../roles";
import { missingDisclosures, resolvePaymentsSwitch } from "../rules";
import { stripeTestMode } from "@/lib/payments/stripe";
import { flags as defaults } from "@/content/flags";

const superOnly = { update: ({ req }: { req: { user?: unknown } }) => isSuperAdmin(req.user as never) };

const flag = (name: keyof typeof defaults, label: string, description: string, extra?: Partial<Field>): Field =>
  ({
    name,
    type: "checkbox",
    label,
    defaultValue: defaults[name],
    access: superOnly,
    admin: { description },
    ...extra,
  }) as Field;

/**
 * Launch flags and operational settings (PRD §12.6). Only super admins change
 * flags; the mission wording sign-off belongs to the legal approver. Switching
 * payments on needs two different super admins.
 */
export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Site settings",
  admin: { group: "Settings" },
  access: {
    read: ({ req }) => isStaff(req.user),
    // Field-level access narrows this further (flags: super admin; disclosures: legal; FX: finance).
    update: ({ req }) => hasRole(req.user, "legal_approver", "finance"),
  },
  fields: [
    {
      type: "collapsible",
      label: "Launch flags",
      fields: [
        flag(
          "paymentsEnabled",
          "Payments enabled",
          "With live Stripe keys this needs two super administrators: the first request is recorded, a second person confirms. With Stripe test keys one super administrator can switch it on. Only switch on for real after legal, processor and production approvals (Gates B–D).",
        ),
        {
          name: "paymentsEnableRequestedBy",
          type: "relationship",
          relationTo: "users",
          label: "Payments switch-on requested by",
          admin: { readOnly: true, description: "Waiting for a second super administrator to confirm." },
        },
        flag("gbpEnabled", "GBP enabled", "Offer British Pounds alongside US Dollars (needs processor approval)."),
        flag("recurringEnabled", "Monthly honoring enabled", "Keep off until legal and processor approval (PRD §9.5)."),
        flag(
          "missionCopyApproved",
          "Purpose section approved",
          "Shows “The Purpose Behind Her Legacy” on the homepage. Only after family, counsel and processor approve the wording.",
          { access: { update: ({ req }) => hasRole(req.user, "legal_approver") } } as Partial<Field>,
        ),
        flag(
          "memorySubmissionsEnabled",
          "Memory submissions open",
          "Only switch on when moderators are assigned and a review time is agreed.",
        ),
        flag(
          "photoSubmissionsEnabled",
          "Photo submissions open",
          "Visitor photo uploads (pending review). Stays closed on the live site until photo storage (Vercel Blob) is connected.",
        ),
        flag("contactFormEnabled", "Contact form open", "Requires a verified support inbox."),
      ],
    },
    {
      type: "collapsible",
      label: "Contributions",
      fields: [
        {
          name: "customAmountMin",
          type: "number",
          defaultValue: 1,
          min: 1,
          required: true,
          access: superOnly,
          admin: { description: "Smallest custom amount, in whole currency units." },
        },
        {
          name: "customAmountMax",
          type: "number",
          defaultValue: 10000,
          min: 1,
          required: true,
          access: superOnly,
          admin: { description: "Largest custom amount, in whole currency units." },
        },
      ],
    },
    {
      type: "collapsible",
      label: "Payment disclosures (shown before payment)",
      admin: {
        description:
          "Required before payments can be switched on (PRD §8.2, §9). Use only wording approved by counsel and the payment processor.",
      },
      fields: [
        {
          name: "legalRecipient",
          type: "text",
          label: "Legal recipient of payments",
          access: { update: ({ req }) => hasRole(req.user, "legal_approver") },
        },
        {
          name: "paymentClassification",
          type: "textarea",
          label: "Payment classification",
          access: { update: ({ req }) => hasRole(req.user, "legal_approver") },
          admin: { description: "For example, whether this is a personal gift, a fund contribution, etc." },
        },
        {
          name: "purposeDisclosure",
          type: "textarea",
          label: "Purpose disclosure",
          access: { update: ({ req }) => hasRole(req.user, "legal_approver") },
        },
        {
          name: "taxStatement",
          type: "textarea",
          label: "Tax status statement",
          defaultValue:
            "This is a payment confirmation, not a charitable tax receipt unless separately stated by an eligible organization.",
          access: { update: ({ req }) => hasRole(req.user, "legal_approver") },
        },
        {
          name: "refundPolicy",
          type: "textarea",
          label: "Refund policy summary",
          access: { update: ({ req }) => hasRole(req.user, "legal_approver") },
        },
      ],
    },
    {
      type: "collapsible",
      label: "Reporting exchange rate (finance)",
      admin: {
        description:
          "Used only for the USD-equivalent total on the finance dashboard and in exports (PRD §13.1). Payments themselves are never converted.",
      },
      fields: [
        {
          name: "gbpToUsdRate",
          type: "number",
          label: "1 GBP = ? USD",
          min: 0.0001,
          admin: { step: 0.0001 },
          access: { update: ({ req }) => hasRole(req.user, "finance") },
        },
        {
          name: "fxRateSource",
          type: "text",
          label: "Rate source",
          admin: { description: "For example: ECB reference rate, or the bank's settlement rate." },
          access: { update: ({ req }) => hasRole(req.user, "finance") },
        },
        {
          name: "fxRateAsOf",
          type: "date",
          label: "Rate date",
          admin: { date: { pickerAppearance: "dayOnly" } },
          access: { update: ({ req }) => hasRole(req.user, "finance") },
        },
      ],
    },
    {
      type: "collapsible",
      label: "Contact",
      fields: [
        {
          name: "supportEmail",
          type: "email",
          access: superOnly,
          admin: { description: "Verified support inbox. Shown publicly. Leave empty until verified." },
        },
        {
          name: "notificationRecipients",
          type: "array",
          access: superOnly,
          fields: [{ name: "email", type: "email", required: true }],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        if (!req.user) return data;
        const merged = { ...originalDoc, ...data };
        const missing = missingDisclosures(merged);
        if (data.paymentsEnabled && !originalDoc?.paymentsEnabled && missing.length) {
          throw new APIError(
            `Complete the payment disclosures before switching payments on: ${missing.join(", ")}.`,
            400,
          );
        }
        const result = resolvePaymentsSwitch(originalDoc ?? {}, data, req.user.id, {
          stripeTestMode: stripeTestMode(),
        });
        data.paymentsEnabled = result.paymentsEnabled;
        data.paymentsEnableRequestedBy = result.paymentsEnableRequestedBy;
        return data;
      },
    ],
    afterChange: [auditGlobalChange, () => revalidateCms()],
  },
};
