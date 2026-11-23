import Image from "next/image";
import { cn } from "@/lib/cn";

const FADE = "radial-gradient(ellipse 58% 62% at 50% 46%, #000 52%, transparent 100%)";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

/**
 * Portrait framed by a warm golden halo and a fine gold ring (PRD §7.1).
 * The image fades into the plum background at the bottom, so it sits
 * inside the hero rather than looking like a pasted rectangle.
 */
export function GlowPortrait({ src, alt, width, height, priority, sizes, className }: Props) {
  return (
    <div className={cn("relative isolate", className)}>
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[38%] -z-10 aspect-square w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(255_214_140/0.55)_0%,rgb(223_166_233/0.25)_45%,transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[38%] -z-10 aspect-square w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/60"
      />
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        // Next 16: `priority` is deprecated; mark the hero portrait as the urgent (LCP) image instead.
        {...(priority ? { fetchPriority: "high" as const, loading: "eager" as const } : {})}
        sizes={sizes ?? "(min-width: 1024px) 50vw, 100vw"}
        className="h-auto w-full"
        style={{ maskImage: FADE, WebkitMaskImage: FADE }}
      />
    </div>
  );
}
