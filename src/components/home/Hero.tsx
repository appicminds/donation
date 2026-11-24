import { ButtonLink } from "@/components/ui/Button";
import { CurvedDivider } from "@/components/ui/CurvedDivider";
import { FloralAccent } from "@/components/ui/FloralAccent";
import { GlowPortrait } from "@/components/ui/GlowPortrait";
import { portrait, site } from "@/content/site";

/** Homepage Section 1: Hero, "Forever Comfort" (PRD §7.1). */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-hero text-white">
      <div className="mx-auto grid max-w-site items-center gap-6 px-4 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8 lg:pt-16">
        <div className="animate-fade-up pb-4 lg:pb-24">
          <p className="eyebrow text-white/80">In Loving Memory of Comfort Kwaw</p>
          <h1 id="hero-title" className="mt-4 text-6xl leading-[0.95] sm:text-7xl xl:text-8xl">
            Forever Comfort
          </h1>
          <p className="mt-4 flex items-center gap-4 font-display text-2xl text-gold italic sm:text-3xl">
            <span aria-hidden="true" className="h-px w-10 bg-gold/70" />
            An Eternal Legacy
            <span aria-hidden="true" className="h-px w-10 bg-gold/70" />
          </p>
          <p className="mt-6 max-w-md text-base text-white/85 sm:text-lg">
            Her love remains in our hearts. Her kindness lives in our memories. Her legacy continues through
            generations.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink href={site.primaryCta.href} arrow>
              {site.primaryCta.label}
            </ButtonLink>
            {/* "Watch Her Story" only once an approved video exists (PRD §7.1). */}
            <ButtonLink href="/memories" variant="outline-light">
              Share a Memory
            </ButtonLink>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <GlowPortrait
            src={portrait.src}
            alt={portrait.alt}
            width={portrait.width}
            height={portrait.height}
            priority
          />
          <FloralAccent className="absolute -right-2 bottom-6 w-20 opacity-90 sm:w-28" />
        </div>
      </div>
      <CurvedDivider className="-mt-6 sm:-mt-10" />
    </section>
  );
}
