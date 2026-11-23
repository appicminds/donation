import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import sharp from "sharp";
import { hashIp } from "../src/lib/submissions/antiabuse";

/**
 * Visitor forms against a real database (CI seeds with SEED_OPEN_FORMS=1).
 * Runs on desktop only and serially, because submissions share one IP and
 * therefore one rate-limit bucket.
 */
const DB = process.env.DATABASE_URL;
test.skip(!DB || !process.env.PAYLOAD_SECRET, "needs DATABASE_URL and PAYLOAD_SECRET");
test.describe.configure({ mode: "serial" });
test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop only"));

const MARK = "E2E-TEST";
let db: pg.Client;

test.beforeAll(async () => {
  db = new pg.Client({ connectionString: DB });
  await db.connect();
  await cleanup();
});
test.afterAll(async () => {
  await cleanup();
  await db?.end();
});

async function cleanup() {
  await db.query(`delete from memories where message like $1`, [`${MARK}%`]);
  await db.query(`delete from contact_messages where message like $1`, [`${MARK}%`]);
  await db.query(`delete from media where origin = 'visitor' and (caption like $1 or visitor_name like $1)`, [
    `${MARK}%`,
  ]);
}

/** The server rejects forms submitted faster than a person could (3 s). */
const humanPause = (page: Page) => page.waitForTimeout(3200);

async function testImage(): Promise<Buffer> {
  return sharp({ create: { width: 800, height: 600, channels: 3, background: "#70228a" } })
    .jpeg()
    .withExif({ IFD0: { Model: "E2E Secret Camera" } })
    .toBuffer();
}

test("memory form validates, then stores a pending, private submission", async ({ page }) => {
  await page.goto("/memories");
  const form = page.getByRole("form", { name: "Share Your Memory" });
  await expect(form.getByRole("button", { name: "Submit Memory" })).toBeEnabled();
  await humanPause(page);

  await form.getByRole("button", { name: "Submit Memory" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Please check the highlighted fields.");
  const message = form.getByLabel("Your message");
  await expect(message).toHaveAttribute("aria-invalid", "true");
  await expect(form.getByText("Please share your message.")).toBeVisible();

  await form.getByLabel("Your name").fill(`${MARK} Ama`);
  await message.fill(`${MARK} She always had time for everyone.`);
  await form.getByLabel("I give permission for my message to appear publicly after family review.").check();
  await form.getByRole("button", { name: "Submit Memory" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("will appear after review, if approved");

  const { rows } = await db.query(
    `select status, public_consent, show_name, ip_hash from memories where message like $1`,
    [`${MARK}%`],
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ status: "pending", public_consent: true, show_name: false });
  expect(rows[0].ip_hash).toMatch(/^[0-9a-f]{32}$/);

  await page.goto("/memories");
  await expect(page.getByText("She always had time for everyone.")).toHaveCount(0);
});

test("memory with a photograph needs the rights confirmation, then stores a private, cleaned image", async ({
  page,
}) => {
  await page.goto("/memories");
  const form = page.getByRole("form", { name: "Share Your Memory" });
  await humanPause(page);
  await form.getByLabel("Your name").fill(`${MARK} Kofi`);
  await form.getByLabel("Your message").fill(`${MARK} With photo.`);
  await form
    .getByLabel(/^Photograph/)
    .setInputFiles({ name: "p.jpg", mimeType: "image/jpeg", buffer: await testImage() });
  await form.getByRole("button", { name: "Submit Memory" }).click();
  await expect(form.getByText("Please confirm you have permission to share this photograph.")).toBeVisible();

  await form
    .getByLabel(/^Photograph/)
    .setInputFiles({ name: "p.jpg", mimeType: "image/jpeg", buffer: await testImage() });
  await form.getByLabel("I have permission to share this photograph.").check();
  await form.getByRole("button", { name: "Submit Memory" }).click();
  await expect(page.getByRole("main").getByRole("status")).toBeVisible();

  const { rows } = await db.query(
    `select m.status, md.approval_status, md.origin, md.visitor_consent, md.filename
       from memories m join media md on md.id = m.photo_id where m.message like $1`,
    [`${MARK} With photo%`],
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    status: "pending",
    approval_status: "pending",
    origin: "visitor",
    visitor_consent: false,
  });

  // Pending visitor media must not be readable by the public API.
  const res = await page.request.get(`/api/media?where[filename][equals]=${rows[0].filename}`);
  expect((await res.json()).totalDocs).toBe(0);
});

test("photo form requires a file and rights, then stores a pending visitor photo", async ({ page }) => {
  await page.goto("/gallery");
  const form = page.getByRole("form", { name: "Share a Photograph" });
  await humanPause(page);
  await form.getByRole("button", { name: "Share a Photograph" }).click();
  await expect(form.getByText("Please choose a photograph to share.")).toBeVisible();
  await expect(form.getByText(/Please confirm you have permission/)).toBeVisible();

  await form
    .getByLabel(/^Photograph/)
    .setInputFiles({ name: "g.jpg", mimeType: "image/jpeg", buffer: await testImage() });
  await form.getByLabel("About this photograph").fill(`${MARK} Garden, summer`);
  await form.getByLabel(/I have permission to share this photograph, including/).check();
  await form.getByLabel(/appear publicly after family review/).check();
  await form.getByRole("button", { name: "Share a Photograph" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("reviewed by the family");

  const { rows } = await db.query(
    `select approval_status, show_in_gallery, visitor_consent, rights_attested, rights_confirmed from media where caption like $1`,
    [`${MARK}%`],
  );
  expect(rows).toEqual([
    {
      approval_status: "pending",
      show_in_gallery: false,
      visitor_consent: true,
      rights_attested: true,
      rights_confirmed: false,
    },
  ]);
});

test("photo form rejects files that are not images", async ({ page }) => {
  await page.goto("/gallery");
  const form = page.getByRole("form", { name: "Share a Photograph" });
  await humanPause(page);
  await form
    .getByLabel(/^Photograph/)
    .setInputFiles({ name: "evil.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<script>alert(1)</script>") });
  await form.getByLabel(/I have permission to share this photograph, including/).check();
  await form.getByRole("button", { name: "Share a Photograph" }).click();
  await expect(form.getByText(/could not be read as a photograph/)).toBeVisible();
});

test("contact form validates and stores the message", async ({ page }) => {
  await page.goto("/contact");
  const form = page.getByRole("form", { name: "Send a message" });
  await humanPause(page);
  await form.getByLabel("Email address").fill("not-an-email");
  await form.getByRole("button", { name: "Send Message" }).click();
  await expect(form.getByText("Please enter a valid email address.")).toBeVisible();
  await expect(form.getByText("Please choose a topic.")).toBeVisible();

  await form.getByLabel("Email address").fill("visitor@example.test");
  await form.getByLabel("Topic").selectOption("payment");
  await form.getByLabel("Your message").fill(`${MARK} Question about a payment.`);
  await form.getByRole("button", { name: "Send Message" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("We will respond as soon as we can.");

  const { rows } = await db.query(`select topic, status from contact_messages where message like $1`, [`${MARK}%`]);
  expect(rows).toEqual([{ topic: "payment", status: "new" }]);
});

test("bots filling the honeypot see success but nothing is stored", async ({ page }) => {
  await page.goto("/contact");
  const form = page.getByRole("form", { name: "Send a message" });
  await humanPause(page);
  await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => (el.value = "http://spam.example"));
  await form.getByLabel("Email address").fill("bot@example.test");
  await form.getByLabel("Topic").selectOption("general");
  await form.getByLabel("Your message").fill(`${MARK} BOT`);
  await form.getByRole("button", { name: "Send Message" }).click();
  await expect(page.getByRole("main").getByRole("status")).toBeVisible();
  const { rows } = await db.query(`select 1 from contact_messages where message = $1`, [`${MARK} BOT`]);
  expect(rows).toHaveLength(0);
});

test("instant submissions are refused", async ({ page }) => {
  await page.goto("/contact");
  const form = page.getByRole("form", { name: "Send a message" });
  await expect(form.getByRole("button", { name: "Send Message" })).toBeEnabled();
  await form.getByLabel("Email address").fill("fast@example.test");
  await form.getByLabel("Topic").selectOption("general");
  await form.getByLabel("Your message").fill(`${MARK} fast`);
  await form.getByRole("button", { name: "Send Message" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("That was very quick");
});

test("rate limit stops a flood from one address", async ({ page }) => {
  // Fill this address's bucket directly (using the hash stored by the contact test), then try one more.
  const { rows: prior } = await db.query(`select ip_hash from contact_messages where message like $1 limit 1`, [
    `${MARK} Question%`,
  ]);
  const ip = prior[0]?.ip_hash ?? hashIp(null);
  for (let i = 0; i < 5; i++) {
    await db.query(
      `insert into contact_messages (email, topic, message, status, ip_hash, updated_at, created_at)
       values ('flood@example.test', 'general', $1, 'new', $2, now(), now())`,
      [`${MARK} flood ${i}`, ip],
    );
  }
  await page.goto("/contact");
  const form = page.getByRole("form", { name: "Send a message" });
  await humanPause(page);
  await form.getByLabel("Email address").fill("flood@example.test");
  await form.getByLabel("Topic").selectOption("general");
  await form.getByLabel("Your message").fill(`${MARK} one too many`);
  await form.getByRole("button", { name: "Send Message" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("several submissions recently");
});
