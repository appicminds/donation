"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { formatMoney, PRESET_AMOUNTS, toMinor, type Currency } from "@/lib/money";

/** Preset amount pills as a radio group, shown in the selected currency (PRD §9.2). */
export function PresetAmounts({
  currency,
  value,
  onChange,
  label,
  hideLabel = false,
  className,
}: {
  currency: Currency;
  value: number | null;
  onChange: (amount: number) => void;
  label: string;
  hideLabel?: boolean;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={className}>
      <legend className={cn(hideLabel ? "sr-only" : "mb-3 text-sm font-semibold")}>{label}</legend>
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
        {PRESET_AMOUNTS[currency].map((amount) => (
          <label key={amount} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={amount}
              checked={value === amount}
              onChange={() => onChange(amount)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex min-h-12 items-center justify-center rounded-xl border bg-white px-3 text-base font-semibold text-ink transition-all",
                "border-ink/10 shadow-sm hover:border-violet/50",
                "peer-checked:border-gold peer-checked:bg-gold peer-checked:text-plum peer-checked:shadow-md",
                "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
              )}
            >
              {formatMoney({ amountMinor: toMinor(amount), currency })}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
