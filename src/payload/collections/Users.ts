import { APIError, type CollectionConfig } from "payload";
import { auditCollectionChange, auditCollectionDelete, auditLogin } from "../audit";
import { isStaff, isSuperAdmin, ROLE_OPTIONS } from "../roles";

const isProd = process.env.NODE_ENV === "production";

/**
 * Admin accounts (PRD §4). Login lockout, short sessions, strict cookies.
 * TOTP is enforced for every account by the payload-totp plugin.
 */
export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "name", "roles"],
    group: "Settings",
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 2 * 60 * 60,
    cookies: { sameSite: "Strict", secure: isProd },
  },
  access: {
    admin: ({ req }) => isStaff(req.user),
    read: ({ req }) => (isSuperAdmin(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false),
    create: ({ req }) => isSuperAdmin(req.user),
    update: ({ req }) => (isSuperAdmin(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false),
    delete: ({ req }) => isSuperAdmin(req.user),
  },
  fields: [
    { name: "name", type: "text" },
    {
      name: "roles",
      type: "select",
      hasMany: true,
      required: true,
      saveToJWT: true,
      options: ROLE_OPTIONS,
      access: {
        // Only super admins assign roles, so no one can escalate their own access.
        create: ({ req }) => isSuperAdmin(req.user),
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: { description: "Grant only the roles this person needs (least privilege)." },
    },
  ],
  hooks: {
    beforeOperation: [
      async ({ operation, req, args }) => {
        if (operation !== "create") return args;
        const { totalDocs } = await req.payload.count({ collection: "users", overrideAccess: true, req });
        if (totalDocs > 0) return args;
        // First-user bootstrap: only the address named in BOOTSTRAP_ADMIN_EMAIL may claim the site.
        const allowed = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
        const email = String(args.data?.email ?? "")
          .trim()
          .toLowerCase();
        if (!allowed || email !== allowed) {
          throw new APIError("The first administrator must use the configured bootstrap email address.", 403);
        }
        args.data = { ...args.data, roles: ["super_admin"] };
        return args;
      },
    ],
    beforeChange: [
      ({ data, originalDoc, req, operation }) => {
        // A super admin cannot remove their own super admin role (avoids locking everyone out).
        if (
          operation === "update" &&
          originalDoc?.id === req.user?.id &&
          isSuperAdmin(originalDoc) &&
          Array.isArray(data.roles) &&
          !data.roles.includes("super_admin")
        ) {
          throw new APIError("You cannot remove your own super administrator role.", 400);
        }
        return data;
      },
    ],
    afterLogin: [
      async ({ req, user }) => {
        await auditLogin(req, user.id);
      },
    ],
    afterChange: [auditCollectionChange],
    afterDelete: [auditCollectionDelete],
  },
  timestamps: true,
};
