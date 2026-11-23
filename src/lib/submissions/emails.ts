import type { Payload } from "payload";

/**
 * Transactional emails for submissions (PRD §10.3). The tone is warm and
 * short. Staff notifications contain a link to the admin, never the
 * visitor's private details.
 */

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, paragraphs: string[]) {
  const text = [title, "", ...paragraphs, "", "With gratitude,", "The family of Comfort Kwaw"].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#FBF7F2;font-family:Georgia,serif;color:#32133D">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#70228A;margin:0 0 8px">Comfort Kwaw Memorial Fund</p>
<h1 style="font-size:26px;font-weight:600;margin:0 0 20px">${escape(title)}</h1>
${paragraphs.map((p) => `<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">${escape(p)}</p>`).join("\n")}
<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin-top:24px">With gratitude,<br>The family of Comfort Kwaw</p>
<p style="font-style:italic;color:#70228A;margin-top:32px">Forever Comfort — An Eternal Legacy</p>
</div></body></html>`;
  return { text, html };
}

async function send(payload: Payload, to: string | string[], subject: string, body: { text: string; html: string }) {
  try {
    await payload.sendEmail({ to, subject, ...body });
  } catch (error) {
    // Email problems must never lose a submission: it is already saved for review.
    payload.logger.error({ err: error, msg: `Email "${subject}" could not be sent` });
  }
}

export async function staffRecipients(payload: Payload): Promise<string[]> {
  const s = await payload.findGlobal({ slug: "site-settings", overrideAccess: true, depth: 0 });
  const list = [...(s.notificationRecipients ?? []).map((r) => r.email), s.supportEmail].filter(Boolean) as string[];
  return [...new Set(list)];
}

const adminUrl = (path: string) => `${process.env.NEXT_PUBLIC_SERVER_URL ?? ""}/admin${path}`;

export async function sendMemoryEmails(payload: Payload, opts: { visitorEmail?: string; hasPhoto: boolean }) {
  if (opts.visitorEmail) {
    await send(
      payload,
      opts.visitorEmail,
      "Thank you for sharing your memory of Comfort Kwaw",
      layout("Thank you for sharing your memory", [
        "Thank you for sharing your memory of Comfort Kwaw. Your message has been received and will appear after review, if approved.",
        "Messages and photographs are reviewed by the family before publication.",
      ]),
    );
  }
  const staff = await staffRecipients(payload);
  if (staff.length) {
    await send(
      payload,
      staff,
      "New memory awaiting review",
      layout("A new memory is awaiting review", [
        `A visitor has shared a memory${opts.hasPhoto ? " with a photograph" : ""}. It is not public until it is approved.`,
        `Review it here: ${adminUrl("/collections/memories?where[status][equals]=pending")}`,
      ]),
    );
  }
}

export async function sendPhotoEmails(payload: Payload, opts: { visitorEmail?: string }) {
  if (opts.visitorEmail) {
    await send(
      payload,
      opts.visitorEmail,
      "Thank you for sharing a photograph of Comfort Kwaw",
      layout("Thank you for sharing a photograph", [
        "Your photograph has been received and will be reviewed by the family before it appears, if approved.",
      ]),
    );
  }
  const staff = await staffRecipients(payload);
  if (staff.length) {
    await send(
      payload,
      staff,
      "New photograph awaiting review",
      layout("A new photograph is awaiting review", [
        "A visitor has shared a photograph. It is private until it is approved.",
        `Review it here: ${adminUrl("/collections/media?where[approvalStatus][equals]=pending")}`,
      ]),
    );
  }
}

export async function sendContactEmails(payload: Payload, opts: { visitorEmail: string; topic: string }) {
  await send(
    payload,
    opts.visitorEmail,
    "We have received your message",
    layout("Thank you for reaching out", [
      "Thank you for reaching out. Your message has been received. We will respond as soon as we can.",
    ]),
  );
  const staff = await staffRecipients(payload);
  if (staff.length) {
    const label = { memorial: "Memorial message", payment: "Payment assistance", general: "General inquiry" }[
      opts.topic
    ];
    await send(
      payload,
      staff,
      `New contact message: ${label ?? "General inquiry"}`,
      layout("A new contact message has arrived", [
        `Topic: ${label ?? opts.topic}.`,
        `Read and reply here: ${adminUrl("/collections/contact-messages?where[status][equals]=new")}`,
      ]),
    );
  }
}
