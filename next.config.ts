import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The public site and the Payload admin have separate root layouts.
    globalNotFound: true,
  },
  turbopack: {
    rules: {
      // Tailwind processes only our own CSS. Third-party CSS in node_modules
      // (Payload, plugin CSS modules) keeps its own handling.
      "*.css": {
        condition: { not: "foreign" },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
