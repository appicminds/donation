import { z } from "zod";

/**
 * Visitor submission rules (PRD §8.3, §11.1). These are shared by server
 * actions and unit tests. Every field is trimmed, and empty optional strings
 * become undefined.
 */

export const LIMITS = {
  name: 120,
  relationship: 120,
  email: 254,
  memory: 2000,
  caption: 300,
  contact: 5000,
  photoBytes: 4 * 1024 * 1024, // Vercel functions accept ~4.5 MB request bodies
  photoPixels: 40_000_000,
} as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : undefined));

/** Opt-in checkbox: only an explicitly ticked box counts as consent. */
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

const email = z.string().trim().max(LIMITS.email).email("Please enter a valid email address.");

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(email.optional());

export const memorySchema = z.object({
  name: optionalText(LIMITS.name),
  relationship: optionalText(LIMITS.relationship),
  email: optionalEmail,
  message: z
    .string()
    .trim()
    .min(1, "Please share your message.")
    .max(LIMITS.memory, `Please keep your message under ${LIMITS.memory} characters.`),
  publicConsent: checkbox,
  showName: checkbox,
});

export const photoSchema = z.object({
  name: optionalText(LIMITS.name),
  email: optionalEmail,
  caption: optionalText(LIMITS.caption),
  rightsAttested: checkbox.refine((v) => v, "Please confirm you have permission to share this photograph."),
  publicConsent: checkbox,
});

export const CONTACT_TOPICS = ["memorial", "payment", "general"] as const;

export const contactSchema = z.object({
  name: optionalText(LIMITS.name),
  email,
  topic: z.enum(CONTACT_TOPICS, { message: "Please choose a topic." }),
  message: z
    .string()
    .trim()
    .min(1, "Please write your message.")
    .max(LIMITS.contact, `Please keep your message under ${LIMITS.contact} characters.`),
});

export type FieldErrors = Record<string, string>;

/** Read a FormData into a plain object, keeping only the listed text keys. */
export function formFields(form: FormData, keys: readonly string[]): Record<string, string | undefined> {
  return Object.fromEntries(
    keys.map((k) => {
      const v = form.get(k);
      return [k, typeof v === "string" ? v : undefined];
    }),
  );
}

export function parse<T extends z.ZodType>(
  schema: T,
  input: unknown,
): { ok: true; data: z.output<T> } | { ok: false; errors: FieldErrors } {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}
