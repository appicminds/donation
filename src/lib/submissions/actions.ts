"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { getSiteSettings, hasDatabase, payloadClient } from "@/lib/cms";
import { checkFormSignals, clientIp, hashIp, issueFormToken, RATE_LIMITS, verifyTurnstile } from "./antiabuse";
import { sendContactEmails, sendMemoryEmails, sendPhotoEmails } from "./emails";
import { ImageRejected, processVisitorImage } from "./image";
import { contactSchema, formFields, memorySchema, parse, photoSchema, type FieldErrors } from "./validation";

export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: FieldErrors;
  /** Echoed text values so the form keeps what the visitor typed after an error. */
  values?: Record<string, string>;
};

const NOT_OPEN = "This form is not open yet. Thank you for your patience.";
const TRY_AGAIN = "Something went wrong. Please try again in a moment.";
const RATE_LIMITED = "You have sent several submissions recently. Please try again a little later.";
const CHECK_FIELDS = "Please check the highlighted fields.";

type Kind = keyof typeof RATE_LIMITS;
const COLLECTION: Record<Kind, "memories" | "media" | "contact-messages"> = {
  memory: "memories",
  photo: "media",
  contact: "contact-messages",
};

function echo(form: FormData, keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")]).filter(([, v]) => v !== ""));
}

/** Shared gate: database, bot signals, Turnstile and per-IP rate limit. */
async function guard(
  form: FormData,
  kind: Kind,
): Promise<{ ok: true; ipHash: string } | { ok: false; state: FormState }> {
  if (!hasDatabase()) return { ok: false, state: { status: "error", message: NOT_OPEN } };

  const signals = checkFormSignals(form);
  if (!signals.ok) {
    // Bots filling the honeypot get a quiet "success" so they learn nothing.
    if (signals.reason === "honeypot") return { ok: false, state: { status: "success" } };
    const message =
      signals.reason === "too-fast"
        ? "That was very quick. Please take a moment and submit again."
        : "For your security, this form has expired. Please reload the page and try again.";
    return { ok: false, state: { status: "error", message } };
  }

  const ip = clientIp(await headers());
  if (!(await verifyTurnstile(form, ip))) {
    return { ok: false, state: { status: "error", message: "Please complete the verification and try again." } };
  }

  const ipHash = hashIp(ip);
  const { max, windowMs } = RATE_LIMITS[kind];
  const payload = await payloadClient();
  const { totalDocs } = await payload.count({
    collection: COLLECTION[kind],
    overrideAccess: true,
    where: {
      and: [
        { ipHash: { equals: ipHash } },
        { createdAt: { greater_than: new Date(Date.now() - windowMs).toISOString() } },
      ],
    },
  });
  if (totalDocs >= max) return { ok: false, state: { status: "error", message: RATE_LIMITED } };
  return { ok: true, ipHash };
}

const photoFrom = (form: FormData): File | null => {
  const f = form.get("photo");
  return f instanceof File && f.size > 0 ? f : null;
};

const MEMORY_KEYS = ["name", "relationship", "email", "message", "publicConsent", "showName", "photoRights"] as const;

export async function submitMemory(_prev: FormState, form: FormData): Promise<FormState> {
  const values = echo(form, MEMORY_KEYS);
  const { flags } = await getSiteSettings();
  if (!flags.memorySubmissionsEnabled) return { status: "error", message: NOT_OPEN, values };

  const gate = await guard(form, "memory");
  if (!gate.ok) return { ...gate.state, values };

  const parsed = parse(memorySchema, formFields(form, MEMORY_KEYS));
  const photo = photoFrom(form);
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };
  if (photo && !flags.photoSubmissionsEnabled)
    errors.photo = "Photo sharing is not open yet. Please send your message without a photograph.";
  if (photo && form.get("photoRights") !== "on")
    errors.photoRights = "Please confirm you have permission to share this photograph.";
  if (!parsed.ok || Object.keys(errors).length) return { status: "error", message: CHECK_FIELDS, errors, values };

  try {
    const payload = await payloadClient();
    let photoId: number | undefined;
    if (photo) {
      let file;
      try {
        file = await processVisitorImage(photo);
      } catch (e) {
        if (e instanceof ImageRejected)
          return { status: "error", message: CHECK_FIELDS, errors: { photo: e.message }, values };
        throw e;
      }
      const media = await payload.create({
        collection: "media",
        overrideAccess: true,
        file,
        data: {
          origin: "visitor",
          visitorName: parsed.data.name,
          visitorEmail: parsed.data.email,
          visitorConsent: parsed.data.publicConsent,
          rightsAttested: true,
          approvalStatus: "pending",
          showInGallery: false,
          ipHash: gate.ipHash,
        },
      });
      photoId = media.id;
    }

    await payload.create({
      collection: "memories",
      overrideAccess: true,
      data: { ...parsed.data, photo: photoId, status: "pending", ipHash: gate.ipHash },
    });

    after(() => sendMemoryEmails(payload, { visitorEmail: parsed.data.email, hasPhoto: Boolean(photoId) }));
    return { status: "success" };
  } catch (error) {
    console.error("[submitMemory]", error);
    return { status: "error", message: TRY_AGAIN, values };
  }
}

const PHOTO_KEYS = ["name", "email", "caption", "rightsAttested", "publicConsent"] as const;

export async function submitPhoto(_prev: FormState, form: FormData): Promise<FormState> {
  const values = echo(form, PHOTO_KEYS);
  const { flags } = await getSiteSettings();
  if (!flags.photoSubmissionsEnabled) return { status: "error", message: NOT_OPEN, values };

  const gate = await guard(form, "photo");
  if (!gate.ok) return { ...gate.state, values };

  const parsed = parse(photoSchema, formFields(form, PHOTO_KEYS));
  const photo = photoFrom(form);
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };
  if (!photo) errors.photo = "Please choose a photograph to share.";
  if (!parsed.ok || Object.keys(errors).length) return { status: "error", message: CHECK_FIELDS, errors, values };

  try {
    let file;
    try {
      file = await processVisitorImage(photo!);
    } catch (e) {
      if (e instanceof ImageRejected)
        return { status: "error", message: CHECK_FIELDS, errors: { photo: e.message }, values };
      throw e;
    }
    const payload = await payloadClient();
    await payload.create({
      collection: "media",
      overrideAccess: true,
      file,
      data: {
        origin: "visitor",
        caption: parsed.data.caption,
        visitorName: parsed.data.name,
        visitorEmail: parsed.data.email,
        visitorConsent: parsed.data.publicConsent,
        rightsAttested: parsed.data.rightsAttested,
        approvalStatus: "pending",
        showInGallery: false,
        ipHash: gate.ipHash,
      },
    });
    after(() => sendPhotoEmails(payload, { visitorEmail: parsed.data.email }));
    return { status: "success" };
  } catch (error) {
    console.error("[submitPhoto]", error);
    return { status: "error", message: TRY_AGAIN, values };
  }
}

const CONTACT_KEYS = ["name", "email", "topic", "message"] as const;

export async function submitContact(_prev: FormState, form: FormData): Promise<FormState> {
  const values = echo(form, CONTACT_KEYS);
  const { flags } = await getSiteSettings();
  if (!flags.contactFormEnabled) return { status: "error", message: NOT_OPEN, values };

  const gate = await guard(form, "contact");
  if (!gate.ok) return { ...gate.state, values };

  const parsed = parse(contactSchema, formFields(form, CONTACT_KEYS));
  if (!parsed.ok) return { status: "error", message: CHECK_FIELDS, errors: parsed.errors, values };

  try {
    const payload = await payloadClient();
    await payload.create({
      collection: "contact-messages",
      overrideAccess: true,
      data: { ...parsed.data, status: "new", ipHash: gate.ipHash },
    });
    after(() => sendContactEmails(payload, { visitorEmail: parsed.data.email, topic: parsed.data.topic }));
    return { status: "success" };
  } catch (error) {
    console.error("[submitContact]", error);
    return { status: "error", message: TRY_AGAIN, values };
  }
}

/**
 * Issue a signed render-time token. Pages are prerendered, so forms fetch a
 * fresh token on mount instead of baking one into static HTML.
 */
export async function getFormToken(): Promise<string> {
  return issueFormToken();
}
