import type { Field, GlobalConfig } from "payload";
import { auditGlobalChange } from "../audit";
import { revalidateCms } from "../revalidate";
import { hasRole, isStaff, isSuperAdmin } from "../roles";
import { resolvePaymentsSwitch } from "../rules";
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
    update: ({ req }) => hasRole(req.user, "legal_approver"),
  },
  fields: [
    {
      type: "collapsible",
      label: "Launch flags",
      fields: [
        flag(
          "paymentsEnabled",
          "Payments enabled",
          "Requires two super administrators: the first request is recorded, a second person confirms. Only switch on after legal, processor and production approvals (Gates B–D).",
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
        flag("photoSubmissionsEnabled", "Photo submissions open", "Visitor photo uploads (pending review)."),
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
        const result = resolvePaymentsSwitch(originalDoc ?? {}, data, req.user.id);
        data.paymentsEnabled = result.paymentsEnabled;
        data.paymentsEnableRequestedBy = result.paymentsEnableRequestedBy;
        return data;
      },
    ],
    afterChange: [auditGlobalChange, () => revalidateCms()],
  },
};
