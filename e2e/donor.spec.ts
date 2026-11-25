import { createHash, createHmac, randomBytes } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import pg from "pg";

/**
 * Donor accounts (PRD addendum A1, revised A1.6). Codes and links are emailed,
 * so the test plants them in the database exactly as the app stores them
 * (a SHA-256 hash of the link token, a keyed hash of the code) and signs the
 * short-lived "pending email" cookie with the same server secret.
 */
const { DATABASE_URL, PAYLOAD_SECRET } = process.env;
test.skip(!DATABASE_URL || !PAYLOAD_SECRET, "needs database");
test.describe.configure({ mode: "serial", timeout: 60_000 });
test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop only"));

const DONOR = "e2e-account@example.test";
const OTHER = "e2e-someone-else@example.test";
const PASSWORD = "a long memorable sentence";
const RECEIPT_TOKEN = randomBytes(24).toString("base64url");
let db: pg.Client;

test.beforeAll(async ({}, info) => {
  if (info.project.name !== "desktop") return;
  db = new pg.Client({ connectionString: DATABASE_URL });
  await db.connect();
  await cleanup();
  const insert = (ref: string, email: string, status: string, amount: number, currency: string, token?: string) =>
    db.query(
      `insert into payments (receipt_ref, access_token, status, amount_minor, currency, donor_email, show_name, refunded_minor, created_at, updated_at, succeeded_at)
       values ($1, $2, $3, $4, $5, $6, false, 0, now(), now(), now())`,
      [ref, token ?? randomBytes(24).toString("base64url"), status, amount, currency, email],
    );
  await insert("CK-E2E1-ACCT", DONOR, "succeeded", 5000, "GBP", RECEIPT_TOKEN);
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
  await db.query(`delete from donors where email like 'e2e-%'`);
  await db.query(`delete from payments where receipt_ref like 'CK-E2E%'`);
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const codeHash = (email: string, code: string) =>
  createHmac("sha256", PAYLOAD_SECRET!).update(`donor-code:${email}:${code}`).digest("hex");

/** Plant a sign-in row (link token + code) for an email; returns both raw values. */
async function plant(email: string, expiresInMs = 10 * 60_000) {
  const token = randomBytes(32).toString("base64url");
  const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  await db.query(
    `insert into donor_login_tokens (token_hash, code_hash, email, kind, expires_at, created_at, updated_at)
     values ($1, $2, $3, 'signin', $4, now(), now())`,
    [sha256(token), codeHash(email, code), email, new Date(Date.now() + expiresInMs).toISOString()],
  );
  return { token, code };
}

/** The signed "pending email" cookie the code page reads, as the app would set it. */
async function setPending(page: Page, email: string) {
  const body = Buffer.from(JSON.stringify({ e: email, x: Date.now() + 20 * 60_000 })).toString("base64url");
  const sig = createHmac("sha256", PAYLOAD_SECRET!).update(`donor-pending:${body}`).digest("base64url");
  await page.goto("/");
  await page.evaluate((v) => {
    document.cookie = `__Host-ck_donor_pending=${v}; Path=/; Secure`;
    document.cookie = `ck_donor_pending=${v}; Path=/`;
  }, `${body}.${sig}`);
}

/**
 * The anti-bot timer starts when the form's token arrives (its submit button
 * becomes enabled), not on page load; waiting 3.2 s after that is safe on slow CI.
 */
async function formReady(page: Page, button: string | RegExp) {
  await expect(page.getByRole("main").getByRole("button", { name: button }).first()).toBeEnabled({ timeout: 15_000 });
  await page.waitForTimeout(3200);
}

async function enterCode(page: Page, code: string) {
  await page.goto("/account/code");
  await formReady(page, "Sign in");
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function signInWithCode(page: Page, email = DONOR) {
  const { code } = await plant(email);
  await setPending(page, email);
  await enterCode(page, code);
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible({ timeout: 15_000 });
}

async function openLink(page: Page, token: string) {
  await page.goto(`/account/verify?token=${token}`);
  await page.getByRole("button", { name: "Continue to your account" }).click();
}

const freshPage = async (browser: Browser) => (await browser.newContext()).newPage();

test("the header offers donor login on every page", async ({ page }) => {
  await page.goto("/legacy");
  await page.getByRole("banner").getByRole("link", { name: "Donor login" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "Sign in to your donor account" })).toBeVisible();
  // One email field; the password field appears only when asked for, keeping the email.
  await expect(page.getByLabel(/^Email address/)).toHaveCount(1);
  await expect(page.getByLabel(/^Password/)).toHaveCount(0);
  await page.getByLabel(/^Email address/).fill(DONOR);
  await page.getByRole("button", { name: "Use my password instead" }).click();
  await expect(page.getByLabel(/^Password/)).toBeFocused();
  await expect(page.getByLabel(/^Email address/)).toHaveValue(DONOR);
  await page.getByRole("button", { name: "Email me a code instead" }).click();
  await expect(page.getByLabel(/^Password/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();
});

test("requesting a code looks the same for known and unknown emails", async ({ browser }) => {
  for (const email of ["e2e-nobody@example.test", DONOR]) {
    const page = await freshPage(browser);
    await page.goto("/account");
    await formReady(page, "Email me a sign-in code");
    await page.getByLabel(/^Email address/).fill(email);
    await page.getByRole("button", { name: "Email me a sign-in code" }).click();
    await expect(page).toHaveURL(/\/account\/code$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Enter your sign-in code" })).toBeVisible();
    await expect(page.getByText(/has an account, we have sent it a 6-digit code/)).toBeVisible();
    await expect(page.getByText(email)).toHaveCount(0); // masked, and never in the URL
  }
  const { rows } = await db.query(
    `select email, code_hash is not null as has_code, used_at is null as open from donor_login_tokens
     where email in ($1, $2) order by email`,
    ["e2e-nobody@example.test", DONOR],
  );
  expect(rows).toEqual([
    { email: DONOR, has_code: true, open: true },
    { email: "e2e-nobody@example.test", has_code: true, open: true },
  ]);
});

test("the right code signs the donor in once and creates their account", async ({ browser }) => {
  const { code } = await plant(DONOR);
  const page = await freshPage(browser);
  await setPending(page, DONOR);
  await enterCode(page, code);
  await expect(page).toHaveURL(/\/account\?welcome=1$/, { timeout: 15_000 });
  await expect(page.getByText("Welcome to your donor account")).toBeVisible();
  const list = page.getByRole("list").filter({ hasText: "CK-E2E1-ACCT" });
  await expect(list).toContainText("£50 GBP");
  await expect(list).toContainText("CK-E2E2-ACCT");
  await expect(page.getByText("CK-E2E9-OTHR")).toHaveCount(0);
  expect((await db.query(`select count(*)::int as n from donors where email = $1`, [DONOR])).rows[0].n).toBe(1);

  const again = await freshPage(browser);
  await setPending(again, DONOR);
  await enterCode(again, code);
  await expect(again.getByRole("main").getByRole("alert")).toContainText("expired or has been used");
});

test("wrong codes are limited to five tries", async ({ browser }) => {
  const { code } = await plant(DONOR);
  const wrong = code === "111111" ? "222222" : "111111";
  const page = await freshPage(browser);
  await setPending(page, DONOR);
  await enterCode(page, wrong);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("You have 4 tries left");
  // Same form, so its timer has long passed: no need to wait between tries.
  for (const left of ["3 tries", "2 tries", "1 try"]) {
    await page.getByLabel("6-digit code").fill(wrong);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(`You have ${left} left`);
  }
  await page.getByLabel("6-digit code").fill(wrong);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Too many wrong attempts");
  await enterCode(page, code);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("expired or has been used");
});

test("the one-tap link still works once and survives email scanners", async ({ browser }) => {
  const { token } = await plant(DONOR);
  const scanner = await freshPage(browser);
  await scanner.goto(`/account/verify?token=${token}`);
  const { rows } = await db.query(`select used_at from donor_login_tokens where token_hash = $1`, [sha256(token)]);
  expect(rows[0].used_at).toBeNull();

  const donor = await freshPage(browser);
  await openLink(donor, token);
  await expect(donor.getByText(`Signed in as ${DONOR}`)).toBeVisible();

  const replay = await freshPage(browser);
  await openLink(replay, token);
  await expect(replay.getByText("This sign-in has expired")).toBeVisible();

  const expired = await freshPage(browser);
  await openLink(expired, (await plant(DONOR, -60_000)).token);
  await expect(expired.getByText("This sign-in has expired")).toBeVisible();
});

test("a donor can add a password and sign in with it", async ({ browser }) => {
  const page = await freshPage(browser);
  await signInWithCode(page);
  await expect(page.getByRole("heading", { name: "Add a password (optional)" })).toBeVisible();
  const setForm = page.getByRole("form", { name: "Add a password (optional)" });
  await formReady(page, "Save password");
  await setForm.getByLabel(/^Password/).fill(PASSWORD);
  await setForm.getByLabel(/^Type it again/).fill("something else entirely");
  await setForm.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("The two passwords don't match.")).toBeVisible();
  await setForm.getByLabel(/^Password/).fill(PASSWORD);
  await setForm.getByLabel(/^Type it again/).fill(PASSWORD);
  await setForm.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("Your password has been saved.")).toBeVisible();
  const stored = (await db.query(`select password_hash from donors where email = $1`, [DONOR])).rows[0].password_hash;
  expect(stored).toMatch(/^scrypt\$/);
  expect(stored).not.toContain(PASSWORD);

  const fresh = await freshPage(browser);
  await fresh.goto("/account");
  await fresh.getByRole("button", { name: "Use my password instead" }).click();
  await formReady(fresh, "Sign in");
  const form = fresh.getByRole("form", { name: "Sign in to your donor account" });
  await form.getByLabel(/^Email address/).fill(DONOR.toUpperCase());
  await form.getByLabel(/^Password/).fill(PASSWORD);
  await form.getByRole("button", { name: "Sign in" }).click();
  await expect(fresh.getByText(`Signed in as ${DONOR}`)).toBeVisible({ timeout: 15_000 });
  await expect(fresh.getByRole("heading", { name: "Your password" })).toBeVisible();
});

async function tryPassword(page: Page, email: string, password: string) {
  await page.goto("/account");
  await page.getByRole("button", { name: "Use my password instead" }).click();
  await formReady(page, "Sign in");
  const form = page.getByRole("form", { name: "Sign in to your donor account" });
  await form.getByLabel(/^Email address/).fill(email);
  await form.getByLabel(/^Password/).fill(password);
  await form.getByRole("button", { name: "Sign in" }).click();
}

test("wrong passwords give one message and pause password sign-in after five", async ({ browser }) => {
  const page = await freshPage(browser);
  await tryPassword(page, "e2e-nobody@example.test", PASSWORD);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("That email and password don't match");

  for (let i = 0; i < 5; i++) {
    await tryPassword(page, DONOR, "not the password at all");
    await expect(page.getByRole("main").getByRole("alert")).toContainText("That email and password don't match");
  }
  // Paused: even the right password is refused, with the same message.
  await tryPassword(page, DONOR, PASSWORD);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("That email and password don't match");
  const { rows } = await db.query(`select password_locked_until > now() as locked from donors where email = $1`, [
    DONOR,
  ]);
  expect(rows[0].locked).toBe(true);

  // Code sign-in still works while password sign-in is paused; then remove the password.
  const donor = await freshPage(browser);
  await signInWithCode(donor);
  await donor.getByRole("button", { name: "Remove password" }).click();
  await expect(donor.getByText("Your password has been removed.")).toBeVisible();
  expect(
    (await db.query(`select password_hash from donors where email = $1`, [DONOR])).rows[0].password_hash,
  ).toBeNull();
});

test("the receipt link pre-fills the sign-in email, and only with the right token", async ({ browser }) => {
  const page = await freshPage(browser);
  await page.goto(`/account?ref=CK-E2E1-ACCT&t=${RECEIPT_TOKEN}`);
  await expect(page.getByLabel(/^Email address/)).toHaveValue(DONOR);

  const guess = await freshPage(browser);
  await guess.goto(`/account?ref=CK-E2E1-ACCT&t=${randomBytes(24).toString("base64url")}`);
  await expect(guess.getByLabel(/^Email address/)).toHaveValue("");
});

test("the confirmation page says the donor account is ready", async ({ page }) => {
  await page.goto(`/honor/confirmation?ref=CK-E2E1-ACCT&t=${RECEIPT_TOKEN}`);
  await expect(page.getByRole("heading", { name: "Your donor account is ready" })).toBeVisible();
  await page.getByRole("link", { name: "Go to your donor account" }).click();
  await expect(page.getByLabel(/^Email address/)).toHaveValue(DONOR);
});

test("a tampered session cookie is treated as signed out", async ({ browser }) => {
  const forged = Buffer.from(JSON.stringify({ e: DONOR, x: 9_999_999_999_999 })).toString("base64url");
  const page = await freshPage(browser);
  await page.goto("/account");
  await page.evaluate((v) => {
    document.cookie = `ck_donor=${v}; Path=/`;
    document.cookie = `__Host-ck_donor=${v}; Path=/; Secure`;
  }, `${forged}.forged`);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Sign in to your donor account" })).toBeVisible();
});

test("the donor can change name display, which is recorded, and sign out", async ({ browser }) => {
  const page = await freshPage(browser);
  await signInWithCode(page);
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
    `select action, summary from audit_logs where actor_label = $1 order by id desc limit 20`,
    [`donor:${DONOR}`],
  );
  const summaries = audit.rows.map((r) => r.summary);
  expect(summaries).toContain("Public name display allowed for 3 payment(s)");
  expect(summaries).toContain("Signed in with an email code");
  expect(summaries).toContain("Password set");
  expect(summaries).toContain("Password removed");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByText("You have signed out.")).toBeVisible();
});
