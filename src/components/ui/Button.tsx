import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "gold" | "light" | "outline-light" | "outline-dark" | "ghost-light";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold tracking-wide transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  // Primary action. Gold sits on the dark plum text for contrast.
  gold: "bg-gold text-plum shadow-[0_8px_24px_-8px_rgb(216_180_90/0.7)] hover:bg-gold-strong",
  light: "bg-white text-plum hover:bg-ivory",
  "outline-light": "border border-gold/80 text-white hover:bg-white/10",
  "outline-dark": "border border-violet text-ink hover:bg-violet hover:text-white",
  "ghost-light": "text-white hover:text-gold",
};

export function buttonClass(variant: ButtonVariant = "gold", className?: string) {
  return cn(base, variants[variant], className);
}

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10h12m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  arrow?: boolean;
  children: ReactNode;
};

export function ButtonLink({ variant = "gold", arrow = false, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, className)} {...props}>
      {children}
      {arrow && <Arrow />}
    </Link>
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; arrow?: boolean };

export function Button({
  variant = "gold",
  arrow = false,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, className)} {...props}>
      {children}
      {arrow && <Arrow />}
    </button>
  );
}
