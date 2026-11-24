import type { CollectionConfig } from "payload";

/**
 * Donor accounts (PRD addendum A1-12, A1-15). One per receipt email, created
 * when a payment succeeds. The password is optional and stored only as a
 * scrypt hash. Reachable only through the Local API used by the account pages.
 */
export const Donors: CollectionConfig = {
  slug: "donors",
  admin: { hidden: true },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: "email", type: "email", required: true, unique: true, index: true },
    { name: "name", type: "text" },
    { name: "passwordHash", type: "text" },
    { name: "passwordSetAt", type: "date" },
    { name: "failedPasswordAttempts", type: "number", defaultValue: 0 },
    { name: "passwordLockedUntil", type: "date" },
    { name: "lastSignInAt", type: "date" },
  ],
  timestamps: true,
};
