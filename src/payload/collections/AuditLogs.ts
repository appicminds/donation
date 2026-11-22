import type { CollectionConfig } from "payload";
import { isSuperAdmin } from "../roles";

/**
 * Append-only audit trail (PRD §4.1, §13). Entries are written by hooks with
 * overrideAccess. No one can create, edit or delete them through the admin or API.
 */
export const AuditLogs: CollectionConfig = {
  slug: "audit-logs",
  labels: { singular: "Audit entry", plural: "Audit log" },
  admin: {
    useAsTitle: "action",
    defaultColumns: ["createdAt", "actorLabel", "action", "entity", "entityId", "summary"],
    group: "Settings",
  },
  access: {
    read: ({ req }) => isSuperAdmin(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: "actor", type: "relationship", relationTo: "users", index: true, maxDepth: 0 },
    { name: "actorLabel", type: "text", label: "Actor" },
    { name: "action", type: "text", required: true, index: true },
    { name: "entity", type: "text", required: true, index: true },
    { name: "entityId", type: "text", index: true },
    { name: "fields", type: "json", label: "Changed fields" },
    { name: "summary", type: "text" },
  ],
  timestamps: true,
};
