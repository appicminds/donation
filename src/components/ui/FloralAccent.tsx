import { cn } from "@/lib/cn";

/**
 * Restrained lily sprig (PRD §6.2: florals stay subtle). It is drawn as SVG
 * so it costs no image request. Decorative only.
 */
export function FloralAccent({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 120 160"
      className={cn("pointer-events-none select-none", className)}
    >
      <defs>
        <linearGradient id="petal" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fbe7f6" />
          <stop offset="1" stopColor="#dfa6e9" />
        </linearGradient>
      </defs>
      <path d="M60 158C58 120 56 96 62 70" stroke="#6b8f5a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M58 118c-14-4-26-14-30-28 14 2 26 12 30 28Z" fill="#7da069" opacity="0.85" />
      <g transform="translate(62 62)">
        {[0, 72, 144, 216, 288].map((deg) => (
          <path
            key={deg}
            transform={`rotate(${deg})`}
            d="M0 0C-8-10-8-30 0-44C8-30 8-10 0 0Z"
            fill="url(#petal)"
            stroke="#c98bd6"
            strokeWidth="0.8"
          />
        ))}
        <circle r="4" fill="#d8b45a" />
      </g>
    </svg>
  );
}
