import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { buildConfig } from "payload";
import { payloadTotp } from "payload-totp";
import sharp from "sharp";
import { migrations } from "./migrations";
import { AuditLogs } from "./payload/collections/AuditLogs";
import { ContactMessages } from "./payload/collections/ContactMessages";
import { DonorLoginTokens } from "./payload/collections/DonorLoginTokens";
import { Media } from "./payload/collections/Media";
import { Memories } from "./payload/collections/Memories";
import { PaymentEvents, Payments, Refunds } from "./payload/collections/Payments";
import { Users } from "./payload/collections/Users";
import { privateBlobStorage } from "./payload/storage/privateBlob";
import { HomepageContent, LegacyContent } from "./payload/globals/content";
import { SiteSettings } from "./payload/globals/SiteSettings";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET ?? "",
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
  admin: {
    user: Users.slug,
    meta: { titleSuffix: " · Comfort Kwaw Memorial Fund admin" },
    importMap: { baseDir: path.resolve(dirname) },
    components: {
      afterNavLinks: ["/payload/components/FinanceNavLink#FinanceNavLink"],
      views: {
        finance: {
          Component: "/payload/views/FinanceDashboard#FinanceDashboard",
          path: "/finance",
          meta: { title: "Finance overview" },
        },
      },
    },
  },
  collections: [Memories, Media, ContactMessages, Payments, Refunds, PaymentEvents, DonorLoginTokens, Users, AuditLogs],
  globals: [HomepageContent, LegacyContent, SiteSettings],
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },
    migrationDir: path.resolve(dirname, "migrations"),
    // Schema changes always go through committed migrations (npm run migrate:create),
    // never auto-push, so dev and production databases cannot drift.
    push: false,
    prodMigrations: migrations,
  }),
  // Transactional email via Resend when configured; otherwise Payload logs emails to the console.
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: process.env.RESEND_API_KEY,
        defaultFromAddress: process.env.EMAIL_FROM_ADDRESS ?? "",
        defaultFromName: "Comfort Kwaw Memorial Fund",
      })
    : undefined,
  sharp,
  upload: { limits: { fileSize: 10 * 1024 * 1024 } },
  graphQL: { disable: true },
  telemetry: false,
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  plugins: [
    // Private Vercel Blob store: files are served only through Payload's access-checked route.
    privateBlobStorage({ token: process.env.BLOB_READ_WRITE_TOKEN, collections: ["media"] }),
    // Must stay last: it wraps every collection's access with TOTP verification (PRD §4.1 MFA).
    payloadTotp({ collection: "users", forceSetup: true, totp: { issuer: "Comfort Kwaw Memorial Fund" } }),
  ],
});
