import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ImageRejected, processVisitorImage } from "./image";

const asFile = (buf: Buffer, name = "x.jpg", type = "image/jpeg") => new File([new Uint8Array(buf)], name, { type });

describe("processVisitorImage", () => {
  it("re-encodes to JPEG and strips EXIF metadata (e.g. GPS)", async () => {
    const withExif = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#70228a" } })
      .jpeg()
      .withExif({ IFD0: { Make: "PhoneCo", Model: "Secret Model" } })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();

    const out = await processVisitorImage(asFile(withExif));
    const meta = await sharp(out.data).metadata();
    expect(out.mimetype).toBe("image/jpeg");
    expect(meta.format).toBe("jpeg");
    expect(meta.exif).toBeUndefined();
    expect(out.data.includes(Buffer.from("Secret Model"))).toBe(false);
  });

  it("downsizes very large images", async () => {
    const big = await sharp({ create: { width: 5000, height: 3000, channels: 3, background: "#fff" } })
      .png()
      .toBuffer();
    const out = await processVisitorImage(asFile(big, "big.png", "image/png"));
    const meta = await sharp(out.data).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBe(2400);
  });

  it("rejects non-images even when they claim to be JPEGs", async () => {
    await expect(processVisitorImage(asFile(Buffer.from("<script>alert(1)</script>")))).rejects.toBeInstanceOf(
      ImageRejected,
    );
  });

  it("rejects oversize and empty files", async () => {
    await expect(processVisitorImage(asFile(Buffer.alloc(5 * 1024 * 1024)))).rejects.toThrow(/smaller than 4 MB/);
    await expect(processVisitorImage(asFile(Buffer.alloc(0)))).rejects.toThrow(/empty/);
  });
});
