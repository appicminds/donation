import type { ReactNode } from "react";
import { Notice } from "./Notice";
import { PageHero } from "./PageHero";
import { Prose } from "./Prose";

/**
 * Shell for legal and utility pages. `draft` pages carry a visible notice
 * until counsel approves the final wording (PRD §8.4, Gate B).
 */
export function LegalPage({
  title,
  intro,
  draft = true,
  children,
}: {
  title: string;
  intro?: string;
  draft?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <PageHero title={title}>{intro && <p>{intro}</p>}</PageHero>
      <div className="mx-auto max-w-site px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        {draft && (
          <Notice title="Draft pending review" className="mb-10 max-w-3xl">
            This page is a working draft. Final wording will be published after review by the family and legal counsel.
          </Notice>
        )}
        <Prose>{children}</Prose>
      </div>
    </>
  );
}
