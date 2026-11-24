import type { CollectionConfig } from "payload";

/**
 * Single-use donor sign-in links (PRD addendum A1-3). Only a SHA-256 hash of
 * each token is stored. Nothing here is reachable through the API or admin;
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
  ],
  timestamps: true,
};
