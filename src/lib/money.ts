/**
 * Money helpers (PRD §9.2, §9.4).
 *
 * Amounts are always integer minor units (cents/pence) paired with an ISO
 * currency code. Values in different currencies are never summed.
 */

export const SUPPORTED_CURRENCIES = ["USD", "GBP"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "USD";

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "USD — US Dollars ($)",
  GBP: "GBP — British Pounds (£)",
};

/**
 * Preset amounts in major units. These are independent nominal amounts per
 * currency, not FX equivalents (PRD §9.2).
 */
export const PRESET_AMOUNTS: Record<Currency, readonly number[]> = {
  USD: [20, 50, 100, 250, 500, 1000],
  GBP: [20, 50, 100, 250, 500, 1000],
};

export type Money = { amountMinor: number; currency: Currency };

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Convert a whole-unit amount (e.g. 50) to minor units (5000). */
export function toMinor(major: number): number {
  if (!Number.isFinite(major)) throw new RangeError("Amount must be a finite number");
  return Math.round(major * 100);
}

/**
 * Format money for display. Whole amounts drop the decimals, so the result
 * is "$1,000" rather than "$1,000.00".
 */
export function formatMoney({ amountMinor, currency }: Money, locale = "en-US"): string {
  if (!Number.isInteger(amountMinor)) throw new RangeError("amountMinor must be an integer");
  const whole = amountMinor % 100 === 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

/** Sum amounts, refusing to mix currencies. */
export function sumMoney(items: readonly Money[], currency: Currency): Money {
  let total = 0;
  for (const item of items) {
    if (item.currency !== currency) {
      throw new Error(`Cannot sum ${item.currency} into a ${currency} total`);
    }
    total += item.amountMinor;
  }
  return { amountMinor: total, currency };
}
