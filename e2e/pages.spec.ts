import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/legacy",
  "/honor",
  "/memories",
  "/gallery",
  "/contact",
  "/privacy",
  "/terms",
  "/payment-information",
  "/accessibility",
];

test.describe("every public page", () => {
  for (const route of routes) {
    test(`${route} loads with one h1 and no accessibility violations`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
    });
  }
});

test.describe("homepage sections", () => {
  test("appear in the agreed order, with the purpose section held back", async ({ page }) => {
    await page.goto("/");
    const headings = await page.locator("main h1, main h2").allTextContents();
    expect(headings).toEqual([
      "Forever Comfort",
      "A Life of Grace, Love and Kindness",
      "A Legacy That Continues to Inspire",
      "Honor Her Memory",
      "Memories & Messages",
      "Photo Gallery",
      "Forever Comfort. Forever Loved.",
    ]);
    await expect(page.getByText("Turning Love Into Hope")).toHaveCount(0);
  });

  test("shows empty states rather than invented testimonials", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Messages of love and remembrance will appear here.")).toBeVisible();
  });

  test("honor picker carries currency and amount to the Honor page", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("section", { has: page.getByRole("heading", { name: "Honor Her Memory" }) });
    await section.getByText("GBP (£)").click();
    await section.getByText("£250").click();
    await section.getByRole("link", { name: "Honor Comfort Kwaw" }).click();
    await expect(page).toHaveURL(/\/honor\?currency=GBP&amount=250$/);
    await expect(page.getByRole("radio", { name: "£250", exact: true })).toBeChecked();
    await expect(page.getByText("GBP · One-time gift")).toBeVisible();
  });
});

test.describe("Honor page", () => {
  test("switching currency updates amounts and summary", async ({ page }) => {
    await page.goto("/honor");
    await expect(page.getByRole("radio", { name: "$50", exact: true })).toBeChecked();
    await page.getByText("GBP (£)").click();
    await expect(page.getByRole("radio", { name: "£50", exact: true })).toBeChecked();
    await expect(page.getByLabel("Enter your amount (GBP)")).toBeVisible();
    await expect(page.getByText("GBP · One-time gift")).toBeVisible();
  });

  test("rejects invalid custom amounts with an accessible error", async ({ page }) => {
    await page.goto("/honor");
    const input = page.getByLabel("Enter your amount (USD)");
    await input.fill("20000");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(/Please enter an amount between \$1 and \$10,000/)).toBeVisible();
    await input.fill("75");
    await expect(input).not.toHaveAttribute("aria-invalid");
    await expect(page.locator("[aria-live=polite]").getByText("$75")).toBeVisible();
  });

  test("ignores tampered prefill values", async ({ page }) => {
    await page.goto("/honor?currency=EUR&amount=-5");
    await expect(page.getByRole("radio", { name: "$50", exact: true })).toBeChecked();
  });

  test("keeps payment unavailable while payments are disabled", async ({ page }) => {
    await page.goto("/honor");
    await expect(page.getByText("Contributions are not open yet")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue to Secure Payment" })).toBeDisabled();
  });
});

test.describe("gallery lightbox", () => {
  test("opens, closes with Escape and returns focus", async ({ page }) => {
    await page.goto("/gallery");
    const thumb = page.getByRole("button", { name: /Portrait of Comfort Kwaw/ });
    await thumb.click();
    const dialog = page.getByRole("dialog", { name: "Photo viewer" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close photo viewer" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(thumb).toBeFocused();
  });
});
