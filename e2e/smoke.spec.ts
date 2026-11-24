import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("site shell", () => {
  test("homepage hero shows PRD copy and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Forever Comfort" })).toBeVisible();
    await expect(page.getByText("In Loving Memory of Comfort Kwaw")).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Forever Comfort", exact: true })
        .getByRole("img", { name: /Portrait of Comfort Kwaw/ }),
    ).toBeVisible();

    const main = page.getByRole("region", { name: "Forever Comfort", exact: true });
    await expect(main.getByRole("link", { name: "Honor Comfort Kwaw" })).toHaveAttribute("href", "/honor");
    await expect(main.getByRole("link", { name: "Share a Memory" })).toHaveAttribute("href", "/memories");
  });

  test("footer has the required legal links and no placeholder email", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    for (const name of ["Privacy Policy", "Terms of Use", "Payment Information", "Accessibility", "Contact"]) {
      await expect(footer.getByRole("navigation", { name: "Legal" }).getByRole("link", { name })).toBeVisible();
    }
    await expect(footer).toContainText(`© ${new Date().getFullYear()}`);
    await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(0);
  });

  test("Home is marked as the current page", async ({ page, isMobile }) => {
    await page.goto("/");
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
    await expect(
      page.getByRole("link", { name: "Home", exact: true }).and(page.locator("[aria-current=page]")).first(),
    ).toBeVisible();
  });

  test("skip link moves focus to main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });

  test("unknown routes show the memorial 404", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("This page could not be found. Please return to the memorial homepage.")).toBeVisible();
  });

  test("homepage has no detectable accessibility violations", async ({ page }) => {
    // Scan the settled page: mid-animation opacity would skew contrast results.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe("mobile menu", () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, "mobile only"));

  test("opens, closes with Escape and returns focus", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    const menuLink = page.getByRole("banner").getByRole("link", { name: "Her Eternal Legacy" });
    await expect(menuLink).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
    await expect(menuLink).toBeHidden();
  });
});
