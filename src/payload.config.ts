import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import { buildConfig } from "payload";
import { payloadTotp } from "payload-totp";
import sharp from "sharp";
import { migrations } from "./migrations";
import { AuditLogs } from "./payload/collections/AuditLogs";
import { ContactMessages } from "./payload/collections/ContactMessages";
import { Media } from "./payload/collections/Media";
import { Memories } from "./payload/collections/Memories";
import { Users } from "./payload/collections/Users";
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
  },
  collections: [Memories, Media, ContactMessages, Users, AuditLogs],
  globals: [HomepageContent, LegacyContent, SiteSettings],
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },
    migrationDir: path.resolve(dirname, "migrations"),
    // Schema changes always go through committed migrations (npm run migrate:create),
    // never auto-push, so dev and production databases cannot drift.
    push: false,
    prodMigrations: migrations,
  }),
  sharp,
  upload: { limits: { fileSize: 10 * 1024 * 1024 } },
  graphQL: { disable: true },
  telemetry: false,
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
    // Must stay last: it wraps every collection's access with TOTP verification (PRD §4.1 MFA).
    payloadTotp({ collection: "users", forceSetup: true, totp: { issuer: "Comfort Kwaw Memorial Fund" } }),
  ],
});
