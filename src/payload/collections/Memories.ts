import { APIError, type CollectionConfig, type FieldAccess } from "payload";
import { auditCollectionChange, auditCollectionDelete } from "../audit";
import { revalidateCms } from "../revalidate";
import { hasRole, isSuperAdmin } from "../roles";
import { checkMemoryApproval } from "../rules";

/** Submitted content is never edited by staff, only moderated (keeps the visitor's words intact). */
const locked: FieldAccess = () => false;

/**
 * Visitor memories (PRD §11.1–11.2, §12.5). Created only by the public
 * submission flow (M3) via the Local API, so they always start as Pending.
 */
export const Memories: CollectionConfig = {
  slug: "memories",
  labels: { singular: "Memory", plural: "Messages for Review" },
  admin: {
    useAsTitle: "summary",
    defaultColumns: ["summary", "name", "status", "publicConsent", "createdAt"],
    group: "Moderation",
    description:
      "Approve, reject or hide visitor messages. A message can only be approved if the visitor gave permission for public display.",
  },
  access: {
    read: ({ req }) => hasRole(req.user, "moderator"),
    create: () => false,
    update: ({ req }) => hasRole(req.user, "moderator"),
    delete: ({ req }) => isSuperAdmin(req.user),
  },
  fields: [
    { name: "summary", type: "text", admin: { hidden: true }, access: { update: locked } },
    { name: "name", type: "text", label: "Visitor name", access: { update: locked } },
    { name: "relationship", type: "text", label: "Connection to Comfort", access: { update: locked } },
    { name: "message", type: "textarea", required: true, maxLength: 2000, access: { update: locked } },
    { name: "photo", type: "relationship", relationTo: "media", access: { update: locked } },
    { name: "email", type: "email", label: "Visitor email (never shown publicly)", access: { update: locked } },
    {
      name: "publicConsent",
      type: "checkbox",
      label: "Visitor gave permission for public display after review",
      defaultValue: false,
      access: { update: locked },
    },
    {
      name: "showName",
      type: "checkbox",
      label: "Visitor agreed to show their name and connection",
      defaultValue: false,
      access: { update: locked },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Hidden from public view", value: "hidden" },
        { label: "Removed", value: "removed" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "ipHash",
      type: "text",
      index: true,
      access: { read: () => false, update: () => false },
      admin: { hidden: true },
    },
    { name: "moderationReason", type: "textarea", label: "Reason (optional)", admin: { position: "sidebar" } },
    { name: "reviewedBy", type: "relationship", relationTo: "users", admin: { position: "sidebar", readOnly: true } },
    { name: "reviewedAt", type: "date", admin: { position: "sidebar", readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req, operation }) => {
        if (operation === "create") {
          // Every submission starts as Pending, whatever the caller sent (PRD §11.1).
          data.status = "pending";
          data.summary = String(data.message ?? "").slice(0, 80);
        }
        const error = checkMemoryApproval({ ...originalDoc, ...data });
        if (error) throw new APIError(error, 400);
        if (operation === "update" && data.status && data.status !== originalDoc?.status) {
          data.reviewedBy = req.user?.id;
          data.reviewedAt = new Date().toISOString();
        }
        return data;
      },
    ],
    afterChange: [auditCollectionChange, () => revalidateCms()],
    afterDelete: [auditCollectionDelete, () => revalidateCms()],
  },
};
