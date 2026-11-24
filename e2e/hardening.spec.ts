import { expect, test } from "@playwright/test";

/** M6: security headers, private-page caching, robots and health stay in place. */
test.describe("hardening", () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop only"));

  test("public pages send the security headers", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("object-src 'none'");
    expect(h["content-security-policy"]).toContain("https://js.stripe.com");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("personal pages are never cached", async ({ request }) => {
    for (const path of ["/account", "/honor/confirmation?ref=x&t=y", "/honor/receipt?ref=x&t=y"]) {
      expect((await request.get(path)).headers()["cache-control"], path).toContain("no-store");
    }
  });

  test("robots keeps private areas out of search engines", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    for (const path of ["/admin", "/api", "/account", "/honor/confirmation", "/honor/receipt"]) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("/account");
    expect(sitemap).toContain("/legacy");
  });

  test("health check reports without leaking configuration", async ({ request }) => {
    const res = await request.get("/api/health");
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["database", "ms", "ok"]);
    expect(["up", "not-configured"]).toContain(body.database);
    expect(res.headers()["cache-control"]).toContain("no-store");
  });
});
