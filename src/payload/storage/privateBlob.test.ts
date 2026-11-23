import { beforeEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({ put: vi.fn(), get: vi.fn(), del: vi.fn() }));
vi.mock("@vercel/blob", () => blob);
const captured = vi.hoisted(() => ({ options: null as unknown }));
vi.mock("@payloadcms/plugin-cloud-storage", () => ({
  cloudStoragePlugin: (options: unknown) => {
    captured.options = options;
    return (c: unknown) => c;
  },
}));

const { privateBlobStorage } = await import("./privateBlob");

function adapter() {
  privateBlobStorage({ token: "vercel_blob_rw_store_secret", collections: ["media"] });
  const opts = captured.options as { enabled: boolean; collections: Record<string, { adapter: () => unknown }> };
  return {
    enabled: opts.enabled,
    a: opts.collections.media.adapter() as Record<string, (...args: never[]) => unknown>,
  };
}

const req = (headers: Record<string, string> = {}) =>
  ({ headers: new Headers(headers), payload: { logger: { error: vi.fn() } } }) as never;

describe("private Blob storage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is disabled without a token", () => {
    privateBlobStorage({ token: undefined, collections: ["media"] });
    expect((captured.options as { enabled: boolean }).enabled).toBe(false);
  });

  it("uploads privately to the resolved path", async () => {
    const { enabled, a } = adapter();
    expect(enabled).toBe(true);
    await a.handleUpload({
      file: { buffer: Buffer.from("x"), mimeType: "image/webp" },
      storageFilePath: "p.webp",
    } as never);
    expect(blob.put).toHaveBeenCalledWith(
      "p.webp",
      expect.any(Buffer),
      expect.objectContaining({ access: "private", contentType: "image/webp", token: "vercel_blob_rw_store_secret" }),
    );
  });

  it("streams files with private caching and supports 304 and 404", async () => {
    const { a } = adapter();
    blob.get.mockResolvedValueOnce({
      statusCode: 200,
      stream: new Blob(["img"]).stream(),
      blob: { etag: '"e1"', contentType: "image/webp", size: 3 },
    });
    const ok = (await a.staticHandler(req(), {
      params: { collection: "media", filename: "p.webp" },
    } as never)) as Response;
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toBe("private, max-age=86400");
    expect(ok.headers.get("content-type")).toBe("image/webp");
    expect(await ok.text()).toBe("img");
    expect(blob.get).toHaveBeenCalledWith("p.webp", expect.objectContaining({ access: "private" }));

    blob.get.mockResolvedValueOnce({ statusCode: 304, stream: null, blob: { etag: '"e1"' } });
    const cached = (await a.staticHandler(req({ "if-none-match": '"e1"' }), {
      params: { collection: "media", filename: "p.webp" },
    } as never)) as Response;
    expect(cached.status).toBe(304);

    blob.get.mockResolvedValueOnce(null);
    const missing = (await a.staticHandler(req(), {
      params: { collection: "media", filename: "x" },
    } as never)) as Response;
    expect(missing.status).toBe(404);
  });

  it("deletes by path", async () => {
    const { a } = adapter();
    await a.handleDelete({ storageFilePath: "p.webp" } as never);
    expect(blob.del).toHaveBeenCalledWith("p.webp", { token: "vercel_blob_rw_store_secret" });
  });
});
