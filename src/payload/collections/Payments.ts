import { APIError, type CollectionConfig, type FieldAccess } from "payload";
import { auditCollectionChange } from "../audit";
import { hasRole } from "../roles";
import { PAYMENT_STATUSES } from "@/lib/payments/rules";
import { financeExport } from "../endpoints/financeExport";

/** Ledger fields are written by the checkout action and the signed webhook only. */
const system: { create: FieldAccess; update: FieldAccess } = { create: () => false, update: () => false };

const money = (name: string, label: string, description?: string) => ({
  name,
  label,
  type: "number" as const,
  access: system,
  admin: { readOnly: true, description },
});

/**
 * Payments ledger (PRD §9.4, §12.3, §13). Amounts are integer minor units
 * plus an ISO currency, and currencies are never mixed. Card data never
 * touches this database: Stripe holds it.
 */
export const Payments: CollectionConfig = {
  slug: "payments",
  labels: { singular: "Payment", plural: "Payments" },
  admin: {
    useAsTitle: "receiptRef",
    defaultColumns: ["receiptRef", "status", "amountMinor", "currency", "donorEmail", "createdAt"],
    group: "Finance",
    listSearchableFields: ["receiptRef", "donorEmail", "stripePaymentIntentId"],
    description: "Amounts are in minor units (cents/pence). Status changes only through verified Stripe webhooks.",
  },
  access: {
    read: ({ req }) => hasRole(req.user, "finance"),
    create: () => false,
    update: ({ req }) => hasRole(req.user, "finance"),
    delete: () => false,
  },
  endpoints: [financeExport],
  fields: [
    { name: "receiptRef", type: "text", required: true, unique: true, index: true, access: system },
    {
      name: "accessToken",
      type: "text",
      required: true,
      access: { ...system, read: () => false },
      admin: { hidden: true },
    },
    { name: "idempotencyKey", type: "text", unique: true, index: true, access: system, admin: { hidden: true } },
    { name: "ipHash", type: "text", index: true, access: { ...system, read: () => false }, admin: { hidden: true } },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "created",
      index: true,
      options: PAYMENT_STATUSES.map((s) => ({ label: s.replace(/_/g, " "), value: s })),
      access: system,
      admin: { position: "sidebar", readOnly: true },
    },
    { ...money("amountMinor", "Amount (minor units)"), required: true },
    {
      name: "currency",
      type: "select",
      required: true,
      options: ["USD", "GBP"],
      access: system,
      admin: { readOnly: true },
    },
    {
      name: "frequency",
      type: "select",
      defaultValue: "one_time",
      options: [{ label: "One-time", value: "one_time" }],
      access: system,
      admin: { readOnly: true },
    },
    {
      type: "collapsible",
      label: "Contributor",
      fields: [
        { name: "donorEmail", type: "email", access: system, admin: { readOnly: true } },
        { name: "donorName", type: "text", access: system, admin: { readOnly: true } },
        {
          name: "showName",
          type: "checkbox",
          label: "Contributor opted in to public display of their name",
          defaultValue: false,
          access: system,
          admin: { readOnly: true, description: "Private by default. Amounts are never shown publicly." },
        },
        { name: "memorialNote", type: "textarea", access: system, admin: { readOnly: true } },
      ],
    },
    {
      type: "collapsible",
      label: "Stripe",
      fields: [
        {
          name: "stripePaymentIntentId",
          type: "text",
          unique: true,
          index: true,
          access: system,
          admin: { readOnly: true },
        },
        { name: "stripeChargeId", type: "text", index: true, access: system, admin: { readOnly: true } },
        { name: "livemode", type: "checkbox", access: system, admin: { readOnly: true } },
        { name: "failureMessage", type: "text", access: system, admin: { readOnly: true } },
        { name: "succeededAt", type: "date", access: system, admin: { readOnly: true } },
        { name: "lastEventAt", type: "date", access: system, admin: { readOnly: true } },
        { name: "receiptEmailSentAt", type: "date", access: system, admin: { readOnly: true } },
      ],
    },
    {
      type: "collapsible",
      label: "Settlement (from Stripe balance transaction)",
      fields: [
        money("grossMinor", "Gross (settlement currency, minor)"),
        money("feeMinor", "Processing fee (settlement currency, minor)"),
        money("netMinor", "Net (settlement currency, minor)"),
        { name: "settlementCurrency", type: "text", access: system, admin: { readOnly: true } },
        {
          name: "fxRate",
          type: "number",
          access: system,
          admin: {
            readOnly: true,
            description: "Stripe's exchange rate from the charge currency to the settlement currency.",
          },
        },
        { name: "balanceTransactionId", type: "text", access: system, admin: { readOnly: true } },
        { name: "availableOn", type: "date", access: system, admin: { readOnly: true } },
      ],
    },
    {
      type: "collapsible",
      label: "Refunds and disputes",
      fields: [
        { ...money("refundedMinor", "Refunded so far (minor units)"), defaultValue: 0 },
        { name: "disputeId", type: "text", access: system, admin: { readOnly: true } },
        { name: "disputeStatus", type: "text", access: system, admin: { readOnly: true } },
        { name: "disputeReason", type: "text", access: system, admin: { readOnly: true } },
        { name: "disputeEvidenceDueBy", type: "date", access: system, admin: { readOnly: true } },
      ],
    },
    {
      name: "refundRequest",
      type: "group",
      label: "Issue a refund",
      admin: {
        description:
          "Finance only. Enter an amount in major units (e.g. 25.00) and save. The refund is sent to Stripe and recorded under Refunds.",
        condition: (data) => ["succeeded", "partially_refunded", "disputed"].includes(data?.status),
      },
      fields: [
        { name: "amount", type: "number", min: 0.01, admin: { step: 0.01 } },
        {
          name: "reason",
          type: "select",
          options: [
            { label: "Requested by contributor", value: "requested_by_customer" },
            { label: "Duplicate payment", value: "duplicate" },
            { label: "Fraudulent", value: "fraudulent" },
          ],
        },
        { name: "confirm", type: "checkbox", label: "I confirm this refund (it cannot be undone)" },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req, operation }) => {
        if (operation !== "update" || !data.refundRequest?.amount) return data;
        if (!hasRole(req.user, "finance")) throw new APIError("Only finance administrators can issue refunds.", 403);
        const { issueRefund } = await import("@/lib/payments/refunds");
        await issueRefund(req, originalDoc, data.refundRequest);
        data.refundRequest = { amount: null, reason: null, confirm: false };
        return data;
      },
    ],
    afterChange: [auditCollectionChange],
  },
  timestamps: true,
};

/** Raw Stripe webhook receipts: proof of what the ledger was told, and the dedupe key. */
export const PaymentEvents: CollectionConfig = {
  slug: "payment-events",
  labels: { singular: "Payment event", plural: "Payment events" },
  admin: {
    useAsTitle: "type",
    defaultColumns: ["createdAt", "type", "stripeEventId", "outcome"],
    group: "Finance",
  },
  access: {
    read: ({ req }) => hasRole(req.user, "finance"),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: "stripeEventId", type: "text", required: true, unique: true, index: true },
    { name: "type", type: "text", required: true, index: true },
    { name: "payment", type: "relationship", relationTo: "payments", index: true },
    { name: "livemode", type: "checkbox" },
    { name: "verified", type: "checkbox", defaultValue: true },
    { name: "outcome", type: "text" },
    { name: "objectId", type: "text", label: "Stripe object id" },
  ],
  timestamps: true,
};

export const Refunds: CollectionConfig = {
  slug: "refunds",
  labels: { singular: "Refund", plural: "Refunds" },
  admin: {
    useAsTitle: "stripeRefundId",
    defaultColumns: ["createdAt", "payment", "amountMinor", "currency", "status"],
    group: "Finance",
  },
  access: {
    read: ({ req }) => hasRole(req.user, "finance"),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: "payment", type: "relationship", relationTo: "payments", required: true, index: true },
    { name: "amountMinor", type: "number", required: true },
    { name: "currency", type: "text", required: true },
    { name: "status", type: "text", index: true },
    { name: "reason", type: "text" },
    { name: "stripeRefundId", type: "text", unique: true, index: true },
    { name: "requestedBy", type: "relationship", relationTo: "users" },
    { name: "notifiedAt", type: "date" },
  ],
  hooks: { afterChange: [auditCollectionChange] },
  timestamps: true,
};
