import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  as?: "h1" | "h2" | "h3";
  tone?: "dark" | "light";
  align?: "left" | "center";
  id?: string;
  children?: ReactNode;
  className?: string;
};

/** Eyebrow, serif heading and optional intro: the pattern used in every section. */
export function SectionHeading({
  eyebrow,
  title,
  as: Tag = "h2",
  tone = "light",
  align = "left",
  id,
  children,
  className,
}: Props) {
  const onDark = tone === "dark";
  return (
    <div className={cn(align === "center" && "mx-auto text-center", "max-w-2xl", className)}>
      {eyebrow && <p className={cn("eyebrow mb-3", onDark ? "text-gold" : "text-violet")}>{eyebrow}</p>}
      <Tag id={id} className={cn("text-4xl sm:text-5xl", onDark ? "text-white" : "text-ink")}>
        {title}
      </Tag>
      {children && (
        <div className={cn("mt-4 text-base sm:text-lg", onDark ? "text-white/85" : "text-ink/80")}>{children}</div>
      )}
    </div>
  );
}
