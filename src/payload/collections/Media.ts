import { APIError, type Access, type CollectionConfig } from "payload";
import { totpAccess } from "payload-totp";
import { auditCollectionChange, auditCollectionDelete } from "../audit";
import { revalidateCms } from "../revalidate";
import { hasRole, isStaff, isSuperAdmin } from "../roles";
import { checkMediaApproval } from "../rules";

const staffRead = totpAccess(({ req }) => isStaff(req.user));

/**
 * Visitors may only see approved images. Staff, once TOTP-verified, see
 * everything. The TOTP wrapper is disabled for `read` so the public check
 * can apply; staff reads are wrapped by hand.
 */
const readMedia: Access = (args) => (args.req.user ? staffRead(args) : { approvalStatus: { equals: "approved" } });

/** Portraits, gallery photographs and visitor uploads (PRD §11.3, §12.4, §20.6). */
export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Image", plural: "Images" },
  admin: {
    useAsTitle: "alt",
    defaultColumns: ["filename", "alt", "approvalStatus", "showInGallery", "updatedAt"],
    group: "Content",
  },
  access: {
    read: readMedia,
    create: ({ req }) => hasRole(req.user, "editor", "publisher", "moderator"),
    update: ({ req }) => hasRole(req.user, "editor", "publisher", "moderator"),
    delete: ({ req }) => isSuperAdmin(req.user),
  },
  custom: { totp: { disableAccessWrapper: { read: true } } },
  upload: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    imageSizes: [
      {
        name: "thumb",
        width: 480,
        height: 480,
        position: "top",
        formatOptions: { format: "webp", options: { quality: 80 } },
      },
      { name: "large", width: 1600, formatOptions: { format: "webp", options: { quality: 82 } } },
    ],
    adminThumbnail: "thumb",
    focalPoint: true,
  },
  fields: [
    {
      name: "alt",
      type: "text",
      label: "Alt text",
      admin: {
        description: "Describe what the image shows, for people using screen readers. Required before approval.",
      },
    },
    {
      name: "caption",
      type: "text",
      admin: { description: "Verified caption only. Never invent dates or context." },
    },
    {
      name: "rightsConfirmed",
      type: "checkbox",
      label: "Usage rights and family permission confirmed",
      defaultValue: false,
    },
    {
      name: "origin",
      type: "select",
      defaultValue: "family",
      options: [
        { label: "Family / staff upload", value: "family" },
        { label: "Shared by a visitor", value: "visitor" },
      ],
      access: { create: () => false, update: () => false },
      admin: { position: "sidebar", readOnly: true },
    },
    {
      type: "collapsible",
      label: "Visitor submission",
      admin: { condition: (data) => data?.origin === "visitor" },
      fields: [
        { name: "visitorName", type: "text", access: { create: () => false, update: () => false } },
        {
          name: "visitorEmail",
          type: "email",
          label: "Visitor email (never shown publicly)",
          access: { create: () => false, update: () => false },
        },
        {
          name: "visitorConsent",
          type: "checkbox",
          label: "Visitor gave permission for public display after review",
          access: { create: () => false, update: () => false },
        },
        {
          name: "rightsAttested",
          type: "checkbox",
          label: "Visitor confirmed they have permission to share this photograph",
          access: { create: () => false, update: () => false },
        },
      ],
    },
    {
      name: "ipHash",
      type: "text",
      index: true,
      access: { read: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: "approvalStatus",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending review", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Removed", value: "removed" },
      ],
      access: {
        // Editors upload; only moderators/publishers decide what becomes public.
        update: ({ req }) => hasRole(req.user, "moderator", "publisher"),
      },
      admin: { position: "sidebar" },
    },
    {
      name: "showInGallery",
      type: "checkbox",
      defaultValue: false,
      admin: { position: "sidebar", description: "Show on the public gallery once approved." },
    },
    {
      name: "sortOrder",
      type: "number",
      defaultValue: 100,
      admin: { position: "sidebar", description: "Lower numbers appear first." },
    },
    { name: "reviewedBy", type: "relationship", relationTo: "users", admin: { position: "sidebar", readOnly: true } },
    { name: "reviewedAt", type: "date", admin: { position: "sidebar", readOnly: true } },
  ],
  hooks: {
    beforeOperation: [
      ({ operation, args }) => {
        // Vercel has no lasting disk: uploads need Vercel Blob (BLOB_READ_WRITE_TOKEN).
        if (operation === "create" && process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
          throw new APIError(
            "Photo storage is not set up yet, so images can't be uploaded on the live site. Connect Vercel Blob to enable uploads.",
            503,
          );
        }
        return args;
      },
    ],
    beforeChange: [
      ({ data, originalDoc, req }) => {
        const merged = { ...originalDoc, ...data };
        const error = checkMediaApproval(merged);
        if (error) throw new APIError(error, 400);
        if (data.approvalStatus && data.approvalStatus !== originalDoc?.approvalStatus) {
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
