/**
 * Test helper (never used in production): create or reset two staff accounts
 * with a known password and TOTP secret, so browser tests can sign in.
 *
 *   E2E_PASSWORD=... E2E_TOTP_SECRET=BASE32... npx payload run e2e/helpers/staff-users.ts
 */
import config from "@payload-config";
import { getPayload } from "payload";

const password = process.env.E2E_PASSWORD;
const totpSecret = process.env.E2E_TOTP_SECRET;
if (!password || !totpSecret || process.env.NODE_ENV === "production" || process.env.VERCEL) {
  console.error("staff-users: refusing to run (needs E2E_PASSWORD, E2E_TOTP_SECRET, and a non-production environment)");
  process.exit(1);
}

const payload = await getPayload({ config });
const accounts = [
  { email: "e2e-finance@example.test", roles: ["finance"] },
  { email: "e2e-editor@example.test", roles: ["editor"] },
] as const;

for (const a of accounts) {
  const { docs } = await payload.find({
    collection: "users",
    where: { email: { equals: a.email } },
    overrideAccess: true,
    limit: 1,
  });
  const { totalDocs } = await payload.count({ collection: "users", overrideAccess: true });
  const data = {
    email: a.email,
    password,
    roles: [...a.roles],
    totpSecret,
    loginAttempts: 0,
    lockUntil: null,
  } as never;
  if (docs[0]) {
    await payload.update({ collection: "users", id: docs[0].id, overrideAccess: true, data });
  } else if (totalDocs === 0 && process.env.BOOTSTRAP_ADMIN_EMAIL !== a.email) {
    console.error(`staff-users: empty database; set BOOTSTRAP_ADMIN_EMAIL=${a.email} for the first account`);
    process.exit(1);
  } else {
    await payload.create({ collection: "users", overrideAccess: true, data });
  }
}
console.log("staff-users: ready");
process.exit(0);
