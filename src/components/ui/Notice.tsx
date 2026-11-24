import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Calm, non-alarming status message (e.g. a feature that is not open yet). */
export function Notice({
  title,
  children,
  tone = "light",
  className,
}: {
  title?: string;
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "rounded-2xl border-l-4 border-gold px-5 py-4",
        tone === "light" ? "bg-white text-ink shadow-sm" : "bg-white/10 text-white",
        className,
      )}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div className={cn("text-sm sm:text-base", title && "mt-1", tone === "light" ? "text-ink/80" : "text-white/85")}>
        {children}
      </div>
    </div>
  );
}
