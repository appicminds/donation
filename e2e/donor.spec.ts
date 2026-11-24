import { createHash, randomBytes } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import pg from "pg";

/**
 * Donor accounts (PRD addendum A1). Sign-in links are emailed, so the test
 * plants a token in the database (only its hash is stored, like the app does)
 * and follows the link as the donor would.
 */
const { DATABASE_URL, PAYLOAD_SECRET } = process.env;
test.skip(!DATABASE_URL || !PAYLOAD_SECRET, "needs database");
test.describe.configure({ mode: "serial" });
test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop only"));

const DONOR = "e2e-account@example.test";
const OTHER = "e2e-someone-else@example.test";
let db: pg.Client;

test.beforeAll(async ({}, info) => {
  if (info.project.name !== "desktop") return;
  db = new pg.Client({ connectionString: DATABASE_URL });
  await db.connect();
  await cleanup();
  const insert = (ref: string, email: string, status: string, amount: number, currency: string) =>
    db.query(
      `insert into payments (receipt_ref, access_token, status, amount_minor, currency, donor_email, show_name, refunded_minor, created_at, updated_at, succeeded_at)
       values ($1, $2, $3, $4, $5, $6, false, 0, now(), now(), now())`,
      [ref, randomBytes(24).toString("base64url"), status, amount, currency, email],
    );
  await insert("CK-E2E1-ACCT", DONOR, "succeeded", 5000, "GBP");
  await insert("CK-E2E2-ACCT", DONOR.toUpperCase(), "succeeded", 2000, "USD"); // matched case-insensitively
  await insert("CK-E2E3-ACCT", DONOR, "failed", 1000, "USD");
  await insert("CK-E2E9-OTHR", OTHER, "succeeded", 9900, "USD");
});
test.afterAll(async ({}, info) => {
  if (info.project.name !== "desktop") return;
  await cleanup();
  await db?.end();
});

async function cleanup() {
  await db.query(`delete from donor_login_tokens where email like 'e2e-%'`);
  await db.query(`delete from payments where receipt_ref like 'CK-E2E%'`);
}

/** Open an emailed sign-in link and press Continue, as the donor would. */
async function openLink(page: Page, token: string) {
  await page.goto(`/account/verify?token=${token}`);
  await page.getByRole("button", { name: "Continue to your account" }).click();
}

/** Plant a sign-in token for an email; returns the raw token for the link. */
async function plantToken(email: string, expiresInMs = 10 * 60_000): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  await db.query(
    `insert into donor_login_tokens (token_hash, email, expires_at, created_at, updated_at) values ($1, $2, $3, now(), now())`,
    [hash, email, new Date(Date.now() + expiresInMs).toISOString()],
  );
  return token;
}

const freshPage = async (browser: Browser) => (await browser.newContext()).newPage();

test("requesting a link gives the same answer for known and unknown emails", async ({ browser }) => {
  for (const email of ["e2e-nobody@example.test", DONOR]) {
    const page = await freshPage(browser);
    await page.goto("/account");
    await page.waitForTimeout(3200); // the server refuses forms sent faster than a person could
    await page.getByLabel("Email address used for your receipt").fill(email);
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByRole("main").getByRole("status")).toContainText("If an account exists for that address", {
      timeout: 15_000,
    });
  }
  const { rows } = await db.query(
    `select email, used_at is not null as used from donor_login_tokens where email = $1`,
    [DONOR],
  );
  expect(rows).toEqual([{ email: DONOR, used: false }]);
});

test("a sign-in link signs the donor in and shows only their payments", async ({ page }) => {
  await openLink(page, await plantToken(DONOR));
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(`Signed in as ${DONOR}`)).toBeVisible();
  const list = page.getByRole("list").filter({ hasText: "CK-E2E1-ACCT" });
  await expect(list).toContainText("£50 GBP");
  await expect(list).toContainText("CK-E2E2-ACCT"); // different capitalisation, same donor
  await expect(list).toContainText("Not completed");
  await expect(page.getByText("CK-E2E9-OTHR")).toHaveCount(0);
  await expect(page.getByText("$99")).toHaveCount(0);

  // Receipt link works from the account.
  await list.getByRole("link", { name: "Receipt" }).first().click();
  await expect(page.getByRole("heading", { name: "Payment confirmation" })).toBeVisible();
});

test("opening the link alone does not use it up (email scanners)", async ({ browser }) => {
  const token = await plantToken(DONOR);
  const scanner = await freshPage(browser);
  await scanner.goto(`/account/verify?token=${token}`);
  await expect(scanner.getByRole("button", { name: "Continue to your account" })).toBeVisible();
  const { rows } = await db.query(`select used_at from donor_login_tokens where token_hash = $1`, [
    createHash("sha256").update(token).digest("hex"),
  ]);
  expect(rows[0].used_at).toBeNull();
  const donor = await freshPage(browser);
  await openLink(donor, token);
  await expect(donor.getByText(`Signed in as ${DONOR}`)).toBeVisible();
});

test("a link works only once, and expired links are refused", async ({ browser }) => {
  const token = await plantToken(DONOR);
  const first = await freshPage(browser);
  await openLink(first, token);
  await expect(first.getByText(`Signed in as ${DONOR}`)).toBeVisible();

  const replay = await freshPage(browser);
  await openLink(replay, token);
  await expect(replay).toHaveURL(/expired=1/);
  await expect(replay.getByText("This link has expired")).toBeVisible();

  const expired = await freshPage(browser);
  await openLink(expired, await plantToken(DONOR, -60_000));
  await expect(expired.getByText("This link has expired")).toBeVisible();

  const forged = await freshPage(browser);
  await openLink(forged, randomBytes(32).toString("base64url"));
  await expect(forged.getByText("This link has expired")).toBeVisible();
});

test("a tampered session cookie is treated as signed out", async ({ browser }) => {
  const forged = Buffer.from(JSON.stringify({ e: DONOR, x: 9_999_999_999_999 })).toString("base64url");
  const page = await freshPage(browser);
  await page.goto("/account");
  // Both cookie names: production uses the __Host- prefix (localhost counts as a secure context).
  await page.evaluate((v) => {
    document.cookie = `ck_donor=${v}; Path=/`;
    document.cookie = `__Host-ck_donor=${v}; Path=/; Secure`;
  }, `${forged}.forged`);
  expect((await page.context().cookies()).map((c) => c.name)).toContain("__Host-ck_donor");
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Sign in with your email" })).toBeVisible();
});

test("the donor can change name display, which is recorded, and sign out", async ({ page }) => {
  await openLink(page, await plantToken(DONOR));
  await page.getByLabel(/may display my name publicly/).check();
  await page.getByRole("button", { name: "Save preference" }).click();
  await expect(page.getByText("Your preference has been saved.")).toBeVisible();

  const { rows } = await db.query(`select bool_and(show_name) as all_on from payments where lower(donor_email) = $1`, [
    DONOR,
  ]);
  expect(rows[0].all_on).toBe(true);
  const other = await db.query(`select show_name from payments where donor_email = $1`, [OTHER]);
  expect(other.rows[0].show_name).toBe(false);
  const audit = await db.query(
    `select summary from audit_logs where actor_label = $1 and action = 'consent' order by id desc limit 1`,
    [`donor:${DONOR}`],
  );
  expect(audit.rows[0].summary).toBe("Public name display allowed for 3 payment(s)");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByText("You have signed out.")).toBeVisible();
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Sign in with your email" })).toBeVisible();
});
