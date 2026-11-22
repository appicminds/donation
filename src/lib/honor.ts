import { DEFAULT_CURRENCY, isCurrency, PRESET_AMOUNTS, type Currency } from "./money";

/**
 * Display-side limits for custom amounts. The authoritative values come from
 * the admin settings and are enforced server-side in M4 (PRD §8.2, §19:
 * limits still to be agreed by management and the processor).
 */
export const CUSTOM_AMOUNT_LIMITS = { min: 1, max: 10_000 } as const;

export type HonorSelection = { currency: Currency; amount: number | null };

/**
 * Parse an Honor prefill from the URL (?currency=GBP&amount=50). Anything
 * invalid is dropped. This only pre-selects the UI. It is never trusted as a
 * charge amount; the server re-validates in M4.
 */
export function parseHonorPrefill(
  params: { get(name: string): string | null },
  allowedCurrencies: readonly Currency[],
): HonorSelection {
  const rawCurrency = params.get("currency")?.toUpperCase();
  const currency = isCurrency(rawCurrency) && allowedCurrencies.includes(rawCurrency) ? rawCurrency : DEFAULT_CURRENCY;

  const rawAmount = params.get("amount");
  const amount = rawAmount && /^\d{1,6}$/.test(rawAmount) ? Number(rawAmount) : null;
  return { currency, amount: amount !== null && isValidAmount(amount) ? amount : null };
}

export function isValidAmount(amount: number): boolean {
  return (
    Number.isFinite(amount) &&
    amount >= CUSTOM_AMOUNT_LIMITS.min &&
    amount <= CUSTOM_AMOUNT_LIMITS.max &&
    // At most two decimal places, tolerant of float error (19.99 * 100 = 1998.999…).
    Math.abs(Math.round(amount * 100) - amount * 100) < 1e-6
  );
}

export function isPreset(currency: Currency, amount: number | null): boolean {
  return amount !== null && PRESET_AMOUNTS[currency].includes(amount);
}
