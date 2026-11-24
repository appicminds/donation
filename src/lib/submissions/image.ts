import sharp, { type Metadata } from "sharp";
import { LIMITS } from "./validation";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif"]);

/** Shaped for Payload's Local API `file` option. */
export type ProcessedImage = { data: Buffer; mimetype: "image/jpeg"; name: string; size: number };

export class ImageRejected extends Error {}

/**
 * Validate and sanitise a visitor photo (PRD §11.1, §15.1):
 *  - size cap, and real decode by sharp (the file extension and MIME header are not trusted)
 *  - allow-listed formats and a pixel limit (blocks decompression bombs)
 *  - re-encode to JPEG, applying orientation and dropping ALL metadata
 *    (EXIF GPS location, device info) and anything else embedded in the file
 */
export async function processVisitorImage(file: File): Promise<ProcessedImage> {
  if (file.size === 0) throw new ImageRejected("The photograph appears to be empty.");
  if (file.size > LIMITS.photoBytes) {
    throw new ImageRejected("Please choose a photograph smaller than 4 MB.");
  }
  const input = Buffer.from(await file.arrayBuffer());

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: LIMITS.photoPixels }).metadata();
  } catch {
    throw new ImageRejected("This file could not be read as a photograph. Please use a JPEG, PNG or WebP image.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new ImageRejected("Please use a JPEG, PNG or WebP image.");
  }

  const data = await sharp(input, { limitInputPixels: LIMITS.photoPixels })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  const stamp = Date.now().toString(36);
  return { data, mimetype: "image/jpeg", name: `visitor-photo-${stamp}.jpg`, size: data.length };
}
