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
