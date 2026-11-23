import type { MetadataRoute } from "next";

const PAGES = [
  "",
  "/legacy",
  "/honor",
  "/memories",
  "/gallery",
  "/contact",
  "/payment-information",
  "/privacy",
  "/terms",
  "/accessibility",
];

/** Public pages only (no account, confirmation or receipt pages). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return PAGES.map((path) => ({ url: `${base}${path}`, changeFrequency: "monthly", priority: path === "" ? 1 : 0.7 }));
}
