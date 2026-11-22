"use client";

import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { paymentCopy } from "@/content/copy";
import { CUSTOM_AMOUNT_LIMITS, isPreset, isValidAmount, parseHonorPrefill } from "@/lib/honor";
import { formatMoney, toMinor, type Currency } from "@/lib/money";
import { CurrencyToggle } from "./CurrencyToggle";
import { PresetAmounts } from "./PresetAmounts";

/**
 * Honor page amount selection (PRD §8.2). M1 covers currency, preset and
 * custom amount, and the summary. Contributor details, review and the Stripe
 * checkout arrive in M4. While payments are disabled, the continue action is
 * unavailable and the visitor sees why.
 */
export function HonorForm({
  currencies,
  paymentsEnabled,
}: {
  currencies: readonly Currency[];
  paymentsEnabled: boolean;
}) {
  const searchParams = useSearchParams();
  const prefill = parseHonorPrefill(searchParams, currencies);

  const [currency, setCurrency] = useState<Currency>(prefill.currency);
  const [preset, setPreset] = useState<number | null>(
    isPreset(prefill.currency, prefill.amount) ? prefill.amount : prefill.amount === null ? 50 : null,
  );
  const [custom, setCustom] = useState<string>(
    prefill.amount !== null && !isPreset(prefill.currency, prefill.amount) ? String(prefill.amount) : "",
  );
  const customId = useId();
  const errorId = useId();
  const noticeId = useId();

  const customValue = custom.trim() === "" ? null : Number(custom);
  const customInvalid = customValue !== null && !isValidAmount(customValue);
  const amount = customValue !== null ? (customInvalid ? null : customValue) : preset;
  const symbol = currency === "USD" ? "$" : "£";

  return (
    <form className="space-y-8" onSubmit={(e) => e.preventDefault()} noValidate>
      <div>
        <CurrencyToggle
          value={currency}
          onChange={setCurrency}
          currencies={currencies}
          label={paymentCopy.currencyLabel}
        />
        <p className="mt-2 text-sm text-ink/70">{paymentCopy.currencyHelp}</p>
      </div>

      <PresetAmounts
        currency={currency}
        value={customValue === null ? preset : null}
        onChange={(a) => {
          setPreset(a);
          setCustom("");
        }}
        label={paymentCopy.amountLabel}
      />

      <div>
        <label htmlFor={customId} className="mb-2 block text-sm font-semibold">
          {paymentCopy.customAmount} ({currency})
        </label>
        <div className="relative max-w-xs">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink/60"
          >
            {symbol}
          </span>
          <input
            id={customId}
            inputMode="decimal"
            autoComplete="off"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ""))}
            aria-invalid={customInvalid || undefined}
            aria-describedby={customInvalid ? errorId : undefined}
            className="min-h-12 w-full rounded-xl border border-ink/20 bg-white pr-4 pl-9 text-base text-ink shadow-sm outline-none focus:border-violet focus:ring-2 focus:ring-violet/30 aria-invalid:border-red-700"
          />
        </div>
        {customInvalid && (
          <p id={errorId} className="mt-2 text-sm font-medium text-red-800">
            Please enter an amount between {symbol}
            {CUSTOM_AMOUNT_LIMITS.min} and {symbol}
            {CUSTOM_AMOUNT_LIMITS.max.toLocaleString("en-US")}, with no more than two decimal places.
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink/5" aria-live="polite">
        <p className="eyebrow text-violet">Your honor</p>
        <p className="mt-2 font-display text-4xl font-semibold text-ink">
          {amount !== null ? formatMoney({ amountMinor: toMinor(amount), currency }) : "—"}
          <span className="ml-2 align-middle font-sans text-sm font-medium text-ink/75">
            {currency} · One-time gift
          </span>
        </p>
        <p className="mt-3 text-sm text-ink/70">{paymentCopy.fxNote}</p>
      </div>

      {!paymentsEnabled && (
        <div id={noticeId}>
          <Notice title="Contributions are not open yet">{paymentCopy.notYetOpen}</Notice>
        </div>
      )}

      <Button
        type="submit"
        arrow
        disabled={!paymentsEnabled || amount === null}
        aria-describedby={!paymentsEnabled ? noticeId : undefined}
      >
        Continue to Secure Payment
      </Button>
    </form>
  );
}
