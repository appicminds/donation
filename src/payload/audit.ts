import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  PayloadRequest,
} from "payload";

/** Fields never copied into the audit trail. */
const SECRET_FIELDS = new Set([
  "password",
  "hash",
  "salt",
  "resetPasswordToken",
  "resetPasswordExpiration",
  "totpSecret",
  "apiKey",
  "loginAttempts",
  "lockUntil",
  "sessions",
  "updatedAt",
  "createdAt",
]);

/** Compare relationships by id, so a populated document equals its plain id. */
const normalize = (v: unknown): unknown =>
  v && typeof v === "object" && !Array.isArray(v) && "id" in v ? (v as { id: unknown }).id : (v ?? null);

export function changedFields(prev: Record<string, unknown> | undefined, next: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(prev ?? {}), ...Object.keys(next)]);
  return [...keys]
    .filter((k) => !SECRET_FIELDS.has(k))
    .filter((k) => JSON.stringify(normalize(prev?.[k])) !== JSON.stringify(normalize(next[k])))
    .sort();
}

async function write(
  req: PayloadRequest,
  entry: { action: string; entity: string; entityId?: string | number; fields?: string[]; summary?: string },
) {
  await req.payload.create({
    collection: "audit-logs",
    overrideAccess: true,
    req,
    data: {
      actor: req.user && req.user.collection === "users" ? req.user.id : undefined,
      actorLabel: req.user ? String((req.user as { email?: string }).email ?? req.user.id) : "system",
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId !== undefined ? String(entry.entityId) : undefined,
      fields: entry.fields?.length ? entry.fields : undefined,
      summary: entry.summary,
    },
  });
}

/** PRD §4.1, §15.1: every privileged write is logged with actor, time, action and record. */
export const auditCollectionChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const fields = changedFields(operation === "create" ? undefined : previousDoc, doc);
  if (operation === "update" && fields.length === 0) return doc;
  const statusField = ["status", "approvalStatus", "_status"].find((f) => fields.includes(f));
  await write(req, {
    action: operation,
    entity: collection.slug,
    entityId: doc.id,
    fields,
    summary: statusField
      ? `${statusField}: ${String(previousDoc?.[statusField] ?? "—")} → ${String(doc[statusField])}`
      : undefined,
  });
  return doc;
};

export const auditCollectionDelete: CollectionAfterDeleteHook = async ({ collection, doc, req }) => {
  await write(req, { action: "delete", entity: collection.slug, entityId: doc.id });
  return doc;
};

export const auditGlobalChange: GlobalAfterChangeHook = async ({ global, doc, previousDoc, req }) => {
  const fields = changedFields(previousDoc, doc);
  if (fields.length) await write(req, { action: "update", entity: `global:${global.slug}`, fields });
  return doc;
};

export async function auditLogin(req: PayloadRequest, userId: string | number) {
  await write(req, { action: "login", entity: "users", entityId: userId });
}
