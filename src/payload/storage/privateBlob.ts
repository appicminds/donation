import { cloudStoragePlugin } from "@payloadcms/plugin-cloud-storage";
import type { Adapter } from "@payloadcms/plugin-cloud-storage/types";
import { del, get, put } from "@vercel/blob";
import type { Plugin } from "payload";

/**
 * Media storage on a PRIVATE Vercel Blob store.
 *
 * Files have no public URL. Every request goes through Payload's
 * `/api/media/file/…` route, so the Media `read` access rule applies: visitors
 * only ever receive approved images, and photos awaiting review stay private.
 * (The official Vercel Blob plugin can upload to private stores but not read
 * from them.)
 */
export function privateBlobStorage({ token, collections }: { token?: string; collections: string[] }): Plugin {
  const adapter: Adapter = () => ({
    name: "vercel-blob-private",
    handleUpload: async ({ file, storageFilePath }) => {
      await put(storageFilePath, file.buffer, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: file.mimeType,
        token,
      });
    },
    handleDelete: async ({ storageFilePath }) => {
      await del(storageFilePath, { token });
    },
    staticHandler: async (req, { params: { collection, filename, prefix } }) => {
      const pathname = [prefix, filename].filter(Boolean).join("/");
      const ifNoneMatch = req.headers.get("if-none-match") ?? undefined;
      try {
        const result = await get(pathname, { access: "private", token, ifNoneMatch });
        if (!result) return new Response("Not found", { status: 404 });
        // `private`: a photo still under review must never be cached by a shared CDN.
        const headers = new Headers({ "Cache-Control": "private, max-age=86400", ETag: result.blob.etag });
        if (result.statusCode === 304) return new Response(null, { status: 304, headers });
        headers.set("Content-Type", result.blob.contentType);
        headers.set("Content-Length", String(result.blob.size));
        headers.set("X-Content-Type-Options", "nosniff");
        return new Response(result.stream, { status: 200, headers });
      } catch (error) {
        req.payload.logger.error({ err: error, collection, filename }, "Blob read failed");
        return new Response("Not found", { status: 404 });
      }
    },
  });

  return cloudStoragePlugin({
    enabled: Boolean(token),
    // Same database schema with or without a token (the plugin adds `_objectKey`).
    alwaysInsertFields: true,
    collections: Object.fromEntries(collections.map((slug) => [slug, { adapter: token ? adapter : null }])),
  });
}
