import Link from "next/link";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

function Bloom({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className={className}>
      <defs>
        <radialGradient id="bloom" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#f3d7fa" />
          <stop offset="0.6" stopColor="#b25fd0" />
          <stop offset="1" stopColor="#70228a" />
        </radialGradient>
      </defs>
      <g transform="translate(20 20)">
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <ellipse key={deg} transform={`rotate(${deg}) translate(0 -9)`} rx="6" ry="9.5" fill="url(#bloom)" />
        ))}
        <circle r="3.4" fill="#d8b45a" />
      </g>
    </svg>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-3 text-white", className)}>
      <Bloom className="size-10 shrink-0 transition-transform duration-500 group-hover:rotate-12" />
      <span className="font-display text-lg leading-[1.05] font-semibold whitespace-nowrap sm:text-xl">
        Comfort Kwaw
        <span className="block">Memorial Fund</span>
      </span>
      <span className="sr-only">: {site.name} home</span>
    </Link>
  );
}
