import type { ReactNode } from "react";
import { CurvedDivider } from "./CurvedDivider";
import { FloralAccent } from "./FloralAccent";

/** Dark opening band used by inner pages, matching the homepage hero. */
export function PageHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <section aria-labelledby="page-title" className="relative overflow-hidden bg-hero text-white">
      <FloralAccent className="absolute -right-4 bottom-10 hidden w-28 opacity-60 sm:block" />
      <div className="mx-auto max-w-site px-4 pt-16 pb-10 text-center sm:px-6 sm:pt-20 lg:px-8">
        {eyebrow && <p className="eyebrow text-gold">{eyebrow}</p>}
        <h1 id="page-title" className="mt-3 text-5xl sm:text-6xl">
          {title}
        </h1>
        {children && <div className="mx-auto mt-5 max-w-2xl text-lg text-white/85">{children}</div>}
      </div>
      <CurvedDivider />
    </section>
  );
}
