import type { MetadataRoute } from "next";

const site = () => process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, "") ?? "";

/** Keep private and operational areas out of search engines. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/account", "/honor/confirmation", "/honor/receipt"],
      },
    ],
    ...(site() ? { sitemap: `${site()}/sitemap.xml` } : {}),
  };
}
