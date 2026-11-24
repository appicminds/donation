"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { DEFAULT_CURRENCY, type Currency } from "@/lib/money";
import { CurrencyToggle } from "./CurrencyToggle";
import { PresetAmounts } from "./PresetAmounts";

/**
 * Homepage Section 5 controls. They only pre-select the Honor page and never
 * collect payment details (PRD §7.5).
 */
export function HomeHonorPicker({ currencies, ctaLabel }: { currencies: readonly Currency[]; ctaLabel: string }) {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [amount, setAmount] = useState<number | null>(50);

  const params = new URLSearchParams({ currency });
  if (amount !== null) params.set("amount", String(amount));

  return (
    <div className="space-y-5">
      <CurrencyToggle
        value={currency}
        onChange={setCurrency}
        currencies={currencies}
        label="Currency"
        hideLabel
        tone="dark"
      />
      <PresetAmounts
        currency={currency}
        value={amount}
        onChange={setAmount}
        label="Choose an amount to honor Comfort Kwaw"
        hideLabel
      />
      <ButtonLink href={`/honor?${params}`} arrow className="w-full sm:w-auto">
        {ctaLabel}
      </ButtonLink>
    </div>
  );
}
