import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { Secret, TOTP } from "otpauth";
import pg from "pg";

/**
 * Finance overview and exports: finance role + verified TOTP session only.
 * Creates two test staff accounts (finance, editor) through a helper script.
 */
const { DATABASE_URL, PAYLOAD_SECRET } = process.env;
test.skip(!DATABASE_URL || !PAYLOAD_SECRET, "needs database");
test.describe.configure({ mode: "serial", timeout: 90_000 });
test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop only"));

const password = `E2e-${randomBytes(9).toString("base64url")}!`;
const secret = new Secret({ size: 20 }).base32;

test.beforeAll(async ({}, info) => {
  if (info.project.name !== "desktop") return;
  execFileSync("npx", ["payload", "run", "e2e/helpers/staff-users.ts"], {
    env: { ...process.env, E2E_PASSWORD: password, E2E_TOTP_SECRET: secret },
    stdio: "pipe",
  });
});

async function signIn(page: Page, email: string) {
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/verify-totp/);
  await page.locator('input[maxlength="1"]').first().click();
  await page.keyboard.type(new TOTP({ secret: Secret.fromBase32(secret) }).generate(), { delay: 40 });
  await page.waitForURL(/\/admin$/);
}

test("anonymous visitors cannot export", async ({ request }) => {
  expect((await request.get("/api/payments/export?format=csv")).status()).toBe(403);
  expect((await request.get("/api/payments/export?format=xlsx")).status()).toBe(403);
});

test("an editor cannot see finance or export", async ({ page }) => {
  await signIn(page, "e2e-editor@example.test");
  await expect(page.locator('a[href="/admin/finance"]')).toHaveCount(0);
  await page.goto("/admin/finance");
  await expect(page.getByText("This page is available to finance administrators only.")).toBeVisible();
  expect((await page.request.get("/api/payments/export?format=csv")).status()).toBe(403);
});

test("finance sees per-currency totals and downloads an audited export", async ({ page }) => {
  await signIn(page, "e2e-finance@example.test");
  // The sidebar link exists for finance staff (the sidebar may be collapsed).
  await expect(page.locator('a[href="/admin/finance"]')).toHaveCount(1);
  await page.goto("/admin/finance");
  await expect(page.getByRole("heading", { name: "Finance overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Honored, by charge currency" })).toBeVisible();
  await expect(page.getByText("USD gross")).toBeVisible();
  await expect(page.getByText("GBP gross")).toBeVisible();
  await expect(page.getByText("Total honored (USD equivalent)")).toBeVisible();

  // A date range narrows the report and is carried into the export.
  await page.getByLabel("From").fill("2026-01-01");
  await page.getByLabel("To").fill("2026-12-31");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/from=2026-01-01&to=2026-12-31/);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("comfort-kwaw-payments_2026-01-01_to_2026-12-31.csv");
  const csv = fs.readFileSync(await download.path(), "utf8");
  expect(csv).toContain("2026-01-01 to 2026-12-31");
  expect(csv).toContain("e2e-finance@example.test");
  expect(csv).toContain("USD amount,GBP amount");

  const db = new pg.Client({ connectionString: DATABASE_URL });
  await db.connect();
  const { rows } = await db.query(
    `select summary from audit_logs where action = 'export' and actor_label = 'e2e-finance@example.test' order by id desc limit 1`,
  );
  await db.end();
  expect(rows[0]?.summary).toMatch(/^CSV export, \d+ payments, 2026-01-01 to 2026-12-31$/);
});
