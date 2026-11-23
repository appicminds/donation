import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { home as homeFallback, legacyPage as legacyFallback } from "@/content/copy";
import { flags as flagFallback } from "@/content/flags";
import { galleryPhotos as galleryFallback, type GalleryPhoto } from "@/content/gallery";
import { site } from "@/content/site";
import { CUSTOM_AMOUNT_LIMITS } from "@/lib/honor";
import type { Currency } from "@/lib/money";
import type { Media } from "@/payload-types";

/**
 * Public-site reads from the CMS. Each read is cached and tagged `cms`, and
 * CMS hooks expire the tag on change. Without a configured database (or if it
 * is unreachable) the site falls back to the PRD-sourced static content, so it
 * never breaks.
 */

const CMS_TAG = "cms";
export const hasDatabase = () => Boolean(process.env.DATABASE_URL && process.env.PAYLOAD_SECRET);

export async function payloadClient() {
  const [{ getPayload }, { default: config }] = await Promise.all([import("payload"), import("@payload-config")]);
  return getPayload({ config });
}

/** Call only inside a "use cache" function: sets exactly one cache lifetime per run. */
async function withFallback<T>(fallback: T, read: () => Promise<T>): Promise<T> {
  if (!hasDatabase()) {
    cacheLife("days");
    return fallback;
  }
  try {
    const value = await read();
    cacheLife("hours"); // CMS hooks expire the tag immediately on change anyway
    return value;
  } catch (error) {
    console.error("[cms] falling back to static content:", error);
    cacheLife("minutes"); // retry soon rather than caching the fallback for long
    return fallback;
  }
}

/** Shallow-merge CMS groups over static defaults, ignoring empty values. */
function mergeCopy<T extends Record<string, Record<string, unknown>>>(
  fallback: T,
  cms: Record<string, unknown> | undefined,
): T {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [key, group] of Object.entries(fallback)) {
    const fromCms = (cms?.[key] ?? {}) as Record<string, unknown>;
    out[key] = { ...group };
    for (const [field, value] of Object.entries(fromCms)) {
      if (typeof value === "string" && value.trim()) out[key][field] = value;
    }
  }
  return out as T;
}

export type SiteSettings = {
  flags: { [K in keyof typeof flagFallback]: boolean };
  currencies: readonly Currency[];
  customAmount: { min: number; max: number };
  supportEmail: string | null;
};

const settingsFallback: SiteSettings = {
  flags: { ...flagFallback },
  currencies: flagFallback.gbpEnabled ? ["USD", "GBP"] : ["USD"],
  customAmount: { ...CUSTOM_AMOUNT_LIMITS },
  supportEmail: site.supportEmail,
};

export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag(CMS_TAG);
  return withFallback(settingsFallback, async () => {
    const payload = await payloadClient();
    const s = await payload.findGlobal({ slug: "site-settings", overrideAccess: true, depth: 0 });
    const flags = Object.fromEntries(
      Object.keys(flagFallback).map((k) => [k, Boolean((s as unknown as Record<string, unknown>)[k])]),
    ) as SiteSettings["flags"];
    return {
      flags,
      currencies: flags.gbpEnabled ? ["USD", "GBP"] : ["USD"],
      customAmount: { min: s.customAmountMin ?? 1, max: s.customAmountMax ?? CUSTOM_AMOUNT_LIMITS.max },
      supportEmail: s.supportEmail || null,
    };
  });
}

export type HomeCopy = typeof homeFallback;

export async function getHomeCopy(): Promise<HomeCopy> {
  "use cache";
  cacheTag(CMS_TAG);
  return withFallback(homeFallback, async () => {
    const payload = await payloadClient();
    const doc = await payload.findGlobal({ slug: "homepage", draft: false, overrideAccess: true, depth: 0 });
    return mergeCopy(
      homeFallback as unknown as Record<string, Record<string, unknown>>,
      doc as never,
    ) as unknown as HomeCopy;
  });
}

export type LegacyCopy = typeof legacyFallback;

export async function getLegacyCopy(): Promise<LegacyCopy> {
  "use cache";
  cacheTag(CMS_TAG);
  return withFallback(legacyFallback, async () => {
    const payload = await payloadClient();
    const doc = await payload.findGlobal({ slug: "legacy-page", draft: false, overrideAccess: true, depth: 0 });
    return mergeCopy({ page: legacyFallback } as never, { page: doc } as never)["page"] as LegacyCopy;
  });
}

export type PublicMemory = {
  id: string;
  message: string;
  name: string | null;
  relationship: string | null;
  photo: { src: string; width: number; height: number; alt: string } | null;
};

/** A memory's photo is shown only if the photo itself passed review. */
function publicPhoto(photo: unknown): PublicMemory["photo"] {
  if (!photo || typeof photo !== "object") return null;
  const p = photo as Media;
  if (p.approvalStatus !== "approved" || !p.rightsConfirmed || !p.alt || !p.url || !p.width || !p.height) return null;
  if (p.origin === "visitor" && !p.visitorConsent) return null;
  const large = p.sizes?.large;
  return {
    src: large?.url || p.url,
    width: large?.width || p.width,
    height: large?.height || p.height,
    alt: p.alt,
  };
}

/** Approved messages with public-display consent only (PRD §7.6, §11.2). */
export async function getApprovedMemories(limit = 24): Promise<PublicMemory[]> {
  "use cache";
  cacheTag(CMS_TAG);
  return withFallback<PublicMemory[]>([], async () => {
    const payload = await payloadClient();
    const { docs } = await payload.find({
      collection: "memories",
      overrideAccess: true,
      depth: 1,
      limit,
      sort: "-reviewedAt",
      where: { and: [{ status: { equals: "approved" } }, { publicConsent: { equals: true } }] },
    });
    return docs.map((m) => ({
      id: String(m.id),
      message: m.message,
      name: m.showName ? m.name || null : null,
      relationship: m.showName ? m.relationship || null : null,
      photo: publicPhoto(m.photo),
    }));
  });
}

/** Family-approved gallery photographs (PRD §11.3). */
export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  "use cache";
  cacheTag(CMS_TAG);
  return withFallback(galleryFallback, async () => {
    const payload = await payloadClient();
    const { docs } = await payload.find({
      collection: "media",
      overrideAccess: true,
      depth: 0,
      limit: 200,
      sort: "sortOrder",
      where: {
        and: [
          { approvalStatus: { equals: "approved" } },
          { showInGallery: { equals: true } },
          { rightsConfirmed: { equals: true } },
        ],
      },
    });
    return docs
      .filter((d) => d.url && d.width && d.height && d.alt)
      .map((d) => ({
        id: String(d.id),
        src: d.sizes?.large?.url || d.url!,
        width: d.sizes?.large?.width || d.width!,
        height: d.sizes?.large?.height || d.height!,
        alt: d.alt!,
        caption: d.caption || undefined,
      }));
  });
}
