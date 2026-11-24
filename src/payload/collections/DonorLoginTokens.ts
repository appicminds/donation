import type { CollectionConfig } from "payload";

/**
 * Single-use donor sign-in links and codes (PRD addendum A1-3, A1-14). Only a
 * SHA-256 hash of each link token and a keyed hash of each code are stored.
 * Rows of kind "password-failure" count wrong passwords per connection (A1-16). Nothing here is reachable through the API or admin;
 * the donor account code uses the Local API.
 */
export const DonorLoginTokens: CollectionConfig = {
  slug: "donor-login-tokens",
  admin: { hidden: true },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: "tokenHash", type: "text", required: true, unique: true, index: true },
    { name: "email", type: "email", required: true, index: true },
    { name: "expiresAt", type: "date", required: true },
    { name: "usedAt", type: "date" },
    { name: "ipHash", type: "text", index: true },
    { name: "codeHash", type: "text" },
    { name: "codeAttempts", type: "number", defaultValue: 0 },
    {
      name: "kind",
      type: "select",
      defaultValue: "signin",
      index: true,
      options: [
        { label: "Sign-in", value: "signin" },
        { label: "Password failure", value: "password-failure" },
      ],
    },
  ],
  timestamps: true,
};
