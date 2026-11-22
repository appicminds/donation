import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PageHero } from "@/components/ui/PageHero";
import { home, memoriesPage } from "@/content/copy";
import { flags } from "@/content/flags";

export const metadata: Metadata = { title: memoriesPage.title, description: memoriesPage.intro };

/** Memories (PRD §11). Shows approved messages only. Submission form arrives in M3. */
export default function MemoriesPage() {
  // Approved, consented messages come from moderation (M2/M3).
  const approved: { id: string; message: string; name?: string; relationship?: string }[] = [];
  return (
    <>
      <PageHero eyebrow="Memories" title={memoriesPage.title}>
        <p>{memoriesPage.intro}</p>
      </PageHero>
      <div className="mx-auto max-w-site px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        {approved.length === 0 && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-violet/30 bg-white/70 px-6 py-12 text-center">
            <span aria-hidden="true" className="font-display text-6xl leading-none text-gold">
              “
            </span>
            <p className="font-display text-2xl text-ink/80 italic sm:text-3xl">{home.memories.empty}</p>
          </div>
        )}

        <section id="share" aria-labelledby="share-title" className="mx-auto mt-16 max-w-2xl scroll-mt-24">
          <h2 id="share-title" className="text-4xl text-ink">
            Share Your Memory
          </h2>
          <p className="mt-3 text-ink/80">{memoriesPage.moderation}</p>
          {flags.memorySubmissionsEnabled ? null : <Notice className="mt-6">{memoriesPage.notYetOpen}</Notice>}
          <ButtonLink href="/legacy" variant="outline-dark" arrow className="mt-8">
            Read Her Story
          </ButtonLink>
        </section>
      </div>
    </>
  );
}
