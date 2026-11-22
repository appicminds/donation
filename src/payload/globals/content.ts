import { APIError, type Field, type GlobalConfig } from "payload";
import { auditGlobalChange } from "../audit";
import { revalidateCms } from "../revalidate";
import { hasRole } from "../roles";
import { checkPublish } from "../rules";
import { home, legacyPage } from "@/content/copy";

/**
 * Editable page copy with draft → publish and version history (PRD §12.4).
 * Defaults are the PRD-sourced strings, so a fresh database shows the same
 * site as the static fallback.
 */
const text = (name: string, defaultValue: string, opts: { long?: boolean; description?: string } = {}): Field => {
  const base = {
    name,
    required: true,
    defaultValue,
    admin: opts.description ? { description: opts.description } : undefined,
  };
  return opts.long ? { ...base, type: "textarea" } : { ...base, type: "text" };
};

const section = (name: string, label: string, fields: Field[]): Field => ({ name, label, type: "group", fields });

function contentGlobal(
  slug: string,
  label: string,
  fields: Field[],
  publishRoles: Parameters<typeof checkPublish>[2] = [],
): GlobalConfig {
  return {
    slug,
    label,
    admin: { group: "Content" },
    versions: { drafts: true, max: 50 },
    access: {
      read: ({ req }) => hasRole(req.user, "editor", "publisher"),
      update: ({ req }) => hasRole(req.user, "editor", "publisher"),
      readVersions: ({ req }) => hasRole(req.user, "editor", "publisher"),
    },
    fields,
    hooks: {
      beforeChange: [
        ({ data, req }) => {
          const error = checkPublish(req.user, data._status, publishRoles);
          if (error) throw new APIError(error, 403);
          return data;
        },
      ],
      afterChange: [auditGlobalChange, () => revalidateCms()],
    },
  };
}

export const HomepageContent = contentGlobal("homepage", "Homepage", [
  section("remembering", "Section 2 — Remembering Comfort", [
    text("eyebrow", home.remembering.eyebrow),
    text("title", home.remembering.title, { description: "Concept headline. Family approval required." }),
    text("body", home.remembering.body, { long: true }),
  ]),
  section("legacy", "Section 3 — Her Eternal Legacy", [
    text("eyebrow", home.legacy.eyebrow),
    text("title", home.legacy.title, { description: "Concept headline. Family approval required." }),
    text("body", home.legacy.body, { long: true }),
  ]),
  section("purpose", "Section 4 — The Purpose Behind Her Legacy", [
    text("eyebrow", home.purpose.eyebrow),
    text("title", home.purpose.title),
    text("body", home.purpose.body, {
      long: true,
      description:
        "Hidden until “Purpose section approved” is switched on in Site settings. Use only wording approved by the family, counsel and the payment processor.",
    }),
  ]),
  section("honor", "Section 5 — Honor Her Memory", [
    text("title", home.honor.title),
    text("body", home.honor.body, { long: true }),
  ]),
  section("memories", "Section 6 — Memories & Messages", [
    text("title", home.memories.title),
    text("body", home.memories.body, { long: true }),
    text("empty", home.memories.empty),
  ]),
  section("gallery", "Section 7 — Photo Gallery", [
    text("title", home.gallery.title),
    text("body", home.gallery.body, { long: true }),
    text("empty", home.gallery.empty),
  ]),
  section("finalCta", "Section 8 — Final call to action", [
    text("title", home.finalCta.title),
    text("body", home.finalCta.body, { long: true }),
  ]),
]);

export const LegacyContent = contentGlobal("legacy-page", "Her Eternal Legacy page", [
  text("title", legacyPage.title),
  text("opening", legacyPage.opening, { long: true }),
  text("story", legacyPage.story, {
    long: true,
    description: "Family-approved biography only. Never invent facts or dates.",
  }),
  text("closing", legacyPage.closing, { long: true }),
]);
