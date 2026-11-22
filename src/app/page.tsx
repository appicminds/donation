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

/** Homepage: the nine agreed sections in order (PRD §7). Section 9, the footer, is global. */
export default function HomePage() {
  return (
    <>
      <Hero />
      <RememberingSection />
      <LegacySection />
      <PurposeSection />
      <HonorSection />
      <MemoriesSection />
      <GallerySection />
      <FinalCtaSection />
    </>
  );
}
