import { Hero } from "@/components/home/Hero";
import {
  FinalCtaSection,
  GallerySection,
  HonorSection,
  LegacySection,
  MemoriesSection,
  PurposeSection,
  RememberingSection,
} from "@/components/home/Sections";
import { getApprovedMemories, getGalleryPhotos, getHomeCopy, getSiteSettings } from "@/lib/cms";

/** Homepage: the nine agreed sections in order (PRD §7). Section 9, the footer, is global. */
export default async function HomePage() {
  const [copy, settings, memories, photos] = await Promise.all([
    getHomeCopy(),
    getSiteSettings(),
    getApprovedMemories(4),
    getGalleryPhotos(),
  ]);
  return (
    <>
      <Hero />
      <RememberingSection c={copy.remembering} />
      <LegacySection c={copy.legacy} />
      <PurposeSection c={copy.purpose} approved={settings.flags.missionCopyApproved} />
      <HonorSection c={copy.honor} currencies={settings.currencies} />
      <MemoriesSection c={copy.memories} memories={memories} />
      <GallerySection c={copy.gallery} photos={photos} />
      <FinalCtaSection c={copy.finalCta} />
    </>
  );
}
