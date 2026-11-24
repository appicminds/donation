import { cn } from "@/lib/cn";

/**
 * Soft wave that moves from one section colour into the next (PRD §6.1).
 * Decorative, so it is hidden from assistive technology.
 */
export function CurvedDivider({
  fill = "var(--color-ivory)",
  flip = false,
  className,
}: {
  fill?: string;
  flip?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className={cn("block h-12 w-full sm:h-20", flip && "rotate-180", className)}
    >
      <path fill={fill} d="M0 64c120 28 260 48 420 40C640 92 760 30 960 22c170-7 330 26 480 60v38H0Z" />
      <path
        fill="none"
        stroke="var(--color-gold)"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        d="M0 64c120 28 260 48 420 40C640 92 760 30 960 22c170-7 330 26 480 60"
      />
    </svg>
  );
}
