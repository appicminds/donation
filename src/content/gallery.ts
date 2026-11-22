import { portrait } from "./site";

export type GalleryPhoto = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Verified caption only. Never invent context (PRD §20.6). */
  caption?: string;
};

/**
 * Family-approved photographs. These move to the CMS media library in M2.
 * Only the client-supplied portrait exists today (approved for staging).
 */
export const galleryPhotos: GalleryPhoto[] = [
  {
    id: "portrait",
    src: portrait.src,
    width: portrait.width,
    height: portrait.height,
    alt: portrait.alt,
  },
];
