import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Readable long-form text styles for legal and utility pages. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-3xl text-base leading-relaxed text-ink/85 sm:text-lg",
        "[&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:text-3xl [&_h2]:text-ink",
        "[&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
        "[&_a]:font-medium [&_a]:text-violet [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-royal",
        className,
      )}
    >
      {children}
    </div>
  );
}
