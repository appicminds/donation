/**
 * Seed the CMS with the client-supplied portrait so the gallery matches the
 * static site. Idempotent: running it twice does nothing the second time.
 *
 *   npm run seed
 *
 * The site owner approved this portrait for the test site (22 Nov 2026).
 * Family sign-off on identity, rights and crop is still required before
 * production (PRD Gate A). Remove or reject it in the admin if that changes.
 */
import path from "node:path";
import config from "@payload-config";
import { getPayload } from "payload";
import { portrait } from "@/content/site";

const payload = await getPayload({ config });
const filename = path.basename(portrait.src);

const existing = await payload.find({
  collection: "media",
  where: { filename: { equals: filename } },
  limit: 1,
  overrideAccess: true,
});

if (existing.totalDocs > 0) {
  payload.logger.info(`Seed: ${filename} already present, skipping.`);
} else {
  await payload.create({
    collection: "media",
    overrideAccess: true,
    filePath: path.resolve(process.cwd(), "public", portrait.src.replace(/^\//, "")),
    data: {
      alt: portrait.alt,
      rightsConfirmed: true,
      approvalStatus: "approved",
      showInGallery: true,
      sortOrder: 1,
    },
  });
  payload.logger.info(`Seed: added ${filename} to the media library.`);
}

process.exit(0);
