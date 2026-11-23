import Image from "next/image";
import Link from "next/link";
import { HomeHonorPicker } from "@/components/honor/HomeHonorPicker";
import { ButtonLink } from "@/components/ui/Button";
import { CurvedDivider } from "@/components/ui/CurvedDivider";
import { FloralAccent } from "@/components/ui/FloralAccent";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { GalleryPhoto } from "@/content/gallery";
import { portrait, site } from "@/content/site";
import type { HomeCopy, PublicMemory } from "@/lib/cms";
import type { Currency } from "@/lib/money";

const container = "mx-auto max-w-site px-4 sm:px-6 lg:px-8";

/** Section 2: Remembering Comfort (PRD §7.2). Ivory editorial split. */
export function RememberingSection({ c }: { c: HomeCopy["remembering"] }) {
  return (
    <section aria-labelledby="remembering-title" className="py-16 sm:py-24">
      <div className={`${container} grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20`}>
        <div className="relative mx-auto w-[86%] max-w-md sm:w-full">
          <div
            aria-hidden="true"
            className="absolute inset-0 -translate-x-4 translate-y-4 -rotate-3 rounded-3xl bg-royal"
          />
          <div className="relative rotate-2 rounded-3xl bg-white p-3 shadow-xl">
            <Image
              src={portrait.src}
              alt=""
              width={portrait.width}
              height={portrait.height}
              sizes="(min-width: 1024px) 28rem, 90vw"
              className="aspect-[4/5] w-full rounded-2xl object-cover object-[50%_20%]"
            />
          </div>
          <FloralAccent className="absolute -bottom-8 -left-6 w-24" />
        </div>

        <div>
          <SectionHeading eyebrow={c.eyebrow} title={c.title} id="remembering-title">
            <p>{c.body}</p>
          </SectionHeading>
          <div aria-hidden="true" className="mt-8 h-px w-24 bg-gold" />
          <ButtonLink href={c.cta.href} variant="outline-dark" arrow className="mt-8">
            {c.cta.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/** Section 3: Her Eternal Legacy (PRD §7.3). Purple feature panel. */
export function LegacySection({ c }: { c: HomeCopy["legacy"] }) {
  return (
    <section aria-labelledby="legacy-title" className="px-2 sm:px-4">
      <div className="relative mx-auto max-w-[88rem] overflow-hidden rounded-[2rem] bg-hero text-white shadow-2xl">
        <div className={`${container} grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2`}>
          <div>
            <SectionHeading eyebrow={c.eyebrow} title={c.title} tone="dark" id="legacy-title">
              <p>{c.body}</p>
            </SectionHeading>
            <ButtonLink href={c.cta.href} variant="outline-light" arrow className="mt-8">
              {c.cta.label}
            </ButtonLink>
          </div>
          <div className="relative mx-auto max-w-md text-center lg:text-left">
            <span aria-hidden="true" className="block font-display text-8xl leading-none text-gold/70">
              “
            </span>
            <blockquote className="-mt-6 font-display text-3xl leading-snug text-white italic sm:text-4xl">
              Forever Comfort. Forever loved. Forever remembered.
            </blockquote>
          </div>
        </div>
        <FloralAccent className="absolute -right-3 -bottom-4 w-24 opacity-70" />
      </div>
    </section>
  );
}

/**
 * Section 4: The Purpose Behind Her Legacy (PRD §7.4). Hidden until the
 * wording is approved by family, counsel and the payment processor.
 */
export function PurposeSection({ c, approved }: { c: HomeCopy["purpose"]; approved: boolean }) {
  if (!approved) return null;
  return (
    <section aria-labelledby="purpose-title" className="py-16 sm:py-24">
      <div className={`${container} grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]`}>
        <div aria-hidden="true" className="mx-auto flex size-48 items-center justify-center rounded-full bg-lilac/30">
          <svg viewBox="0 0 64 64" className="size-24 text-violet" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M32 50S14 39 14 26a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 13-18 24-18 24Z" />
            <path d="M32 26v10m-5-5h10" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <SectionHeading eyebrow={c.eyebrow} title={c.title} id="purpose-title">
            <p>{c.body}</p>
          </SectionHeading>
          <ButtonLink href={c.cta.href} variant="outline-dark" arrow className="mt-8">
            {c.cta.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/** Section 5: Honor Her Memory (PRD §7.5). Pathway only, no card fields. */
export function HonorSection({ c, currencies }: { c: HomeCopy["honor"]; currencies: readonly Currency[] }) {
  return (
    <section aria-labelledby="honor-title" className="px-2 py-16 sm:px-4 sm:py-24">
      <div className="relative mx-auto max-w-[88rem] overflow-hidden rounded-[2rem] bg-hero text-white shadow-2xl">
        <FloralAccent className="absolute -bottom-4 -left-3 w-24 opacity-80" />
        <div className={`${container} grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[0.8fr_1.2fr]`}>
          <SectionHeading title={c.title} tone="dark" id="honor-title">
            <p>{c.body}</p>
          </SectionHeading>
          <HomeHonorPicker currencies={currencies} ctaLabel={c.cta} />
        </div>
      </div>
    </section>
  );
}

/** Section 6: Memories & Messages (PRD §7.6). Approved messages only. */
export function MemoriesSection({ c, memories }: { c: HomeCopy["memories"]; memories: PublicMemory[] }) {
  return (
    <section aria-labelledby="memories-title" className="pb-16 sm:pb-24">
      <div className={`${container} grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16`}>
        <SectionHeading title={c.title} id="memories-title">
          <p>{c.body}</p>
        </SectionHeading>
        <div className="flex flex-col justify-center gap-6">
          {memories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-violet/30 bg-white/70 px-6 py-10 text-center">
              <span aria-hidden="true" className="font-display text-5xl leading-none text-gold">
                “
              </span>
              <p className="font-display text-2xl text-ink/80 italic">{c.empty}</p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {memories.slice(0, 4).map((m) => (
                <li key={m.id}>
                  <MemoryCard memory={m} />
                </li>
              ))}
            </ul>
          )}
          <div>
            <ButtonLink href={c.cta.href} variant="outline-dark" arrow>
              {c.cta.label}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/** One approved message. Name and connection only if the visitor opted in. */
export function MemoryCard({ memory }: { memory: PublicMemory }) {
  return (
    <figure className="h-full rounded-2xl bg-white p-6 shadow-sm ring-1 ring-ink/5">
      {memory.photo && (
        <Image
          src={memory.photo.src}
          alt={memory.photo.alt}
          width={memory.photo.width}
          height={memory.photo.height}
          sizes="(min-width: 1024px) 24rem, 90vw"
          className="mb-4 aspect-[4/3] w-full rounded-xl object-cover"
        />
      )}
      <span aria-hidden="true" className="font-display text-4xl leading-none text-gold">
        “
      </span>
      <blockquote className="-mt-2 whitespace-pre-line text-ink/85">{memory.message}</blockquote>
      {memory.name && (
        <figcaption className="mt-4 text-sm font-semibold text-violet">
          — {memory.name}
          {memory.relationship && <span className="font-normal text-ink/70">, {memory.relationship}</span>}
        </figcaption>
      )}
    </figure>
  );
}

/** Section 7: Photo Gallery (PRD §7.7). Family-approved photographs only. */
export function GallerySection({ c, photos: all }: { c: HomeCopy["gallery"]; photos: GalleryPhoto[] }) {
  const photos = all.slice(0, 6);
  return (
    <section aria-labelledby="gallery-title" className="border-t border-ink/10 py-16 sm:py-24">
      <div className={`${container} grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16`}>
        <div>
          <SectionHeading title={c.title} id="gallery-title">
            <p>{c.body}</p>
          </SectionHeading>
          <ButtonLink href={c.cta.href} variant="outline-dark" arrow className="mt-8">
            {c.cta.label}
          </ButtonLink>
        </div>
        {photos.length === 0 ? (
          <p className="self-center rounded-2xl border border-dashed border-violet/30 px-6 py-10 text-center font-display text-2xl text-ink/80 italic">
            {c.empty}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <li key={p.id}>
                <Link href="/gallery" className="block overflow-hidden rounded-2xl shadow-md">
                  <Image
                    src={p.src}
                    alt={p.alt}
                    width={p.width}
                    height={p.height}
                    sizes="(min-width: 1024px) 15rem, 45vw"
                    className="aspect-square w-full object-cover object-top transition-transform duration-500 hover:scale-105"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Section 8: Final CTA (PRD §7.8). Deep purple closing band. */
export function FinalCtaSection({ c }: { c: HomeCopy["finalCta"] }) {
  return (
    <section aria-labelledby="final-title" className="relative overflow-hidden bg-plum text-white">
      <CurvedDivider fill="var(--color-plum)" className="bg-ivory" />
      <div className="relative bg-[radial-gradient(60%_80%_at_50%_0%,rgb(112_34_138/0.6),transparent)]">
        <FloralAccent className="absolute bottom-0 left-2 w-24 sm:left-10 sm:w-32" />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <h2 id="final-title" className="text-4xl italic sm:text-6xl">
            {c.title}
          </h2>
          <p className="mt-5 text-lg text-white/85">{c.body}</p>
          <ButtonLink href={site.primaryCta.href} arrow className="mt-9">
            {site.primaryCta.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
