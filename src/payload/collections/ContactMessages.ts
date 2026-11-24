import type { CollectionConfig } from "payload";
import { auditCollectionChange, auditCollectionDelete } from "../audit";
import { hasRole, isSuperAdmin } from "../roles";

/** Contact form submissions (PRD §8.3, §13). Visible to support staff only. */
export const ContactMessages: CollectionConfig = {
  slug: "contact-messages",
  labels: { singular: "Contact message", plural: "Contact messages" },
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "topic", "status", "createdAt"],
    group: "Support",
  },
  access: {
    read: ({ req }) => hasRole(req.user, "support"),
    create: () => false, // public form (M3) writes via the Local API
    update: ({ req }) => hasRole(req.user, "support"),
    delete: ({ req }) => isSuperAdmin(req.user),
  },
  fields: [
    { name: "name", type: "text", access: { update: () => false } },
    { name: "email", type: "email", required: true, access: { update: () => false } },
    {
      name: "topic",
      type: "select",
      required: true,
      options: [
        { label: "Memorial message", value: "memorial" },
        { label: "Payment assistance", value: "payment" },
        { label: "General inquiry", value: "general" },
      ],
      access: { update: () => false },
    },
    { name: "message", type: "textarea", required: true, maxLength: 5000, access: { update: () => false } },
    {
      name: "ipHash",
      type: "text",
      index: true,
      access: { read: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: "status",
      type: "select",
      defaultValue: "new",
      options: [
        { label: "New", value: "new" },
        { label: "In progress", value: "in_progress" },
        { label: "Resolved", value: "resolved" },
      ],
      admin: { position: "sidebar" },
    },
    { name: "internalNotes", type: "textarea", admin: { position: "sidebar" } },
  ],
  hooks: { afterChange: [auditCollectionChange], afterDelete: [auditCollectionDelete] },
};
