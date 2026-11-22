import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { CurvedDivider } from "@/components/ui/CurvedDivider";
import { FloralAccent } from "@/components/ui/FloralAccent";
import { GlowPortrait } from "@/components/ui/GlowPortrait";
import { legacyPage as legacyDefaults } from "@/content/copy";
import { getLegacyCopy } from "@/lib/cms";
import { portrait, site } from "@/content/site";

export const metadata: Metadata = { title: legacyDefaults.title, description: legacyDefaults.opening };

/**
 * Her Eternal Legacy (PRD §8.1). Uses only copy from the supplied brief. The
 * timeline and story chapters wait for verified, family-approved content.
 */
export default async function LegacyPage() {
  const legacyPage = await getLegacyCopy();
  return (
    <>
      <section aria-labelledby="page-title" className="relative overflow-hidden bg-hero text-white">
        <div className="mx-auto grid max-w-site items-center gap-8 px-4 pt-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="animate-fade-up pb-6 lg:pb-20">
            <p className="eyebrow text-gold">In Loving Memory of Comfort Kwaw</p>
            <h1 id="page-title" className="mt-4 text-5xl sm:text-7xl">
              {legacyPage.title}
            </h1>
            <p className="mt-6 max-w-md font-display text-2xl text-white/90 italic sm:text-3xl">{legacyPage.opening}</p>
          </div>
          <GlowPortrait
            src={portrait.src}
            alt={portrait.alt}
            width={portrait.width}
            height={portrait.height}
            priority
          />
        </div>
        <CurvedDivider className="-mt-6 sm:-mt-10" />
      </section>

      <section aria-label="Her story" className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <div aria-hidden="true" className="mx-auto mb-8 h-px w-24 bg-gold" />
        <p className="font-display text-2xl leading-relaxed text-ink sm:text-3xl">{legacyPage.story}</p>
        <div aria-hidden="true" className="mx-auto mt-8 h-px w-24 bg-gold" />
      </section>

      <section aria-label="Closing words" className="px-2 pb-16 sm:px-4 sm:pb-24">
        <div className="relative mx-auto max-w-[88rem] overflow-hidden rounded-[2rem] bg-hero px-6 py-16 text-center text-white sm:py-20">
          <FloralAccent className="absolute -bottom-4 -left-3 w-24 opacity-80" />
          <p className="mx-auto max-w-2xl font-display text-3xl leading-snug italic sm:text-4xl">
            {legacyPage.closing}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <ButtonLink href={site.primaryCta.href} arrow>
              {site.primaryCta.label}
            </ButtonLink>
            <ButtonLink href="/memories" variant="outline-light">
              Share a Memory
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
