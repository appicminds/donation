"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

/** PRD §8.4: system error copy. */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Monitoring (Sentry) hooks in here in M6.
    console.error(error);
  }, [error]);

  return (
    <section className="bg-hero text-white">
      <div className="mx-auto flex max-w-site flex-col items-center px-4 py-28 text-center sm:px-6 lg:px-8">
        <h1 className="text-5xl sm:text-6xl">Something went wrong</h1>
        <p className="mt-5 max-w-md text-lg text-white/85">Something went wrong. Please try again in a moment.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button onClick={() => retry()}>Try again</Button>
          <ButtonLink href="/" variant="outline-light">
            Return to the Memorial
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
