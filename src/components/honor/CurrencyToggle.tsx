"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import type { Currency } from "@/lib/money";

const SYMBOL: Record<Currency, string> = { USD: "$", GBP: "£" };

/** Segmented USD/GBP radio group. Native radios keep it keyboard and screen-reader friendly. */
export function CurrencyToggle({
  value,
  onChange,
  currencies,
  label,
  hideLabel = false,
  tone = "light",
}: {
  value: Currency;
  onChange: (c: Currency) => void;
  currencies: readonly Currency[];
  label: string;
  hideLabel?: boolean;
  tone?: "light" | "dark";
}) {
  const name = useId();
  if (currencies.length < 2) return null;
  return (
    <fieldset>
      <legend className={cn(hideLabel ? "sr-only" : "mb-2 text-sm font-semibold")}>{label}</legend>
      <div
        className={cn(
          "inline-flex rounded-full p-1",
          tone === "dark" ? "bg-white/10 ring-1 ring-white/20" : "bg-ink/5 ring-1 ring-ink/10",
        )}
      >
        {currencies.map((c) => (
          <label key={c} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={c}
              checked={value === c}
              onChange={() => onChange(c)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors",
                "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
                tone === "dark" ? "text-white/80" : "text-ink/70",
                "peer-checked:bg-gold peer-checked:text-plum",
              )}
            >
              {c} ({SYMBOL[c]})
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
