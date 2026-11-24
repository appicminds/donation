/**
 * Finance reporting (PRD §12.2, §13.1). Pure functions over payment rows.
 *
 * Rules:
 *  - Original charge amounts stay in their own currency; USD and GBP are never summed.
 *  - Fees and net come from Stripe's balance transactions, in the *settlement*
 *    currency (which can differ from both), and are reported per settlement currency.
 *  - A USD-equivalent total is shown only with an explicit, documented rate.
 */

export const CHARGE_CURRENCIES = ["USD", "GBP"] as const;
export type ChargeCurrency = (typeof CHARGE_CURRENCIES)[number];

export type PaymentRow = {
  receiptRef: string;
  status: string;
  currency: ChargeCurrency;
  amountMinor: number;
  refundedMinor?: number | null;
  donorEmail?: string | null;
  createdAt: string;
  succeededAt?: string | null;
  settlementCurrency?: string | null;
  grossMinor?: number | null;
  feeMinor?: number | null;
  netMinor?: number | null;
  disputeStatus?: string | null;
};

/** Statuses that mean money was successfully collected at some point. */
export const COLLECTED = new Set(["succeeded", "partially_refunded", "refunded", "disputed"]);
export const PENDING = new Set(["created", "requires_payment", "processing"]);
export const UNSUCCESSFUL = new Set(["failed", "canceled"]);

export type CurrencyTotals = {
  currency: ChargeCurrency;
  successfulCount: number;
  grossMinor: number;
  refundedMinor: number;
  netOfRefundsMinor: number;
  disputedCount: number;
  disputedMinor: number;
};

export type SettlementTotals = {
  currency: string;
  count: number;
  grossMinor: number;
  feeMinor: number;
  netMinor: number;
};

export type FxBasis = { gbpToUsd: number; source: string; asOf: string };

export type FinanceSummary = {
  byCurrency: Record<ChargeCurrency, CurrencyTotals>;
  settlement: SettlementTotals[];
  /** Successful payments still waiting for Stripe's settlement figures. */
  awaitingSettlement: number;
  pendingCount: number;
  unsuccessfulCount: number;
  supporters: number;
  usdEquivalent: { totalMinor: number; basis: FxBasis } | null;
};

export type DateRange = { from?: string; to?: string };

/** Payments whose *creation* falls inside [from, to] (UTC dates, inclusive). */
export function inRange(row: { createdAt: string }, range: DateRange): boolean {
  const t = Date.parse(row.createdAt);
  if (range.from && t < Date.parse(`${range.from}T00:00:00.000Z`)) return false;
  if (range.to && t > Date.parse(`${range.to}T23:59:59.999Z`)) return false;
  return true;
}

export function summarise(rows: readonly PaymentRow[], fx: FxBasis | null): FinanceSummary {
  const byCurrency = Object.fromEntries(
    CHARGE_CURRENCIES.map((c) => [
      c,
      {
        currency: c,
        successfulCount: 0,
        grossMinor: 0,
        refundedMinor: 0,
        netOfRefundsMinor: 0,
        disputedCount: 0,
        disputedMinor: 0,
      },
    ]),
  ) as Record<ChargeCurrency, CurrencyTotals>;
  const settlement = new Map<string, SettlementTotals>();
  const supporters = new Set<string>();
  let pendingCount = 0;
  let unsuccessfulCount = 0;
  let awaitingSettlement = 0;

  for (const r of rows) {
    if (PENDING.has(r.status)) pendingCount += 1;
    else if (UNSUCCESSFUL.has(r.status)) unsuccessfulCount += 1;
    if (!COLLECTED.has(r.status)) continue;

    const t = byCurrency[r.currency];
    const refunded = Math.min(r.refundedMinor ?? 0, r.amountMinor);
    t.successfulCount += 1;
    t.grossMinor += r.amountMinor;
    t.refundedMinor += refunded;
    t.netOfRefundsMinor += r.amountMinor - refunded;
    if (r.status === "disputed") {
      t.disputedCount += 1;
      t.disputedMinor += r.amountMinor;
    }
    if (r.donorEmail) supporters.add(r.donorEmail.trim().toLowerCase());

    if (r.settlementCurrency && r.feeMinor != null && r.netMinor != null) {
      const s = settlement.get(r.settlementCurrency) ?? {
        currency: r.settlementCurrency,
        count: 0,
        grossMinor: 0,
        feeMinor: 0,
        netMinor: 0,
      };
      s.count += 1;
      s.grossMinor += r.grossMinor ?? 0;
      s.feeMinor += r.feeMinor;
      s.netMinor += r.netMinor;
      settlement.set(r.settlementCurrency, s);
    } else {
      awaitingSettlement += 1;
    }
  }

  const usdEquivalent =
    fx && fx.gbpToUsd > 0
      ? {
          totalMinor: byCurrency.USD.netOfRefundsMinor + Math.round(byCurrency.GBP.netOfRefundsMinor * fx.gbpToUsd),
          basis: fx,
        }
      : null;

  return {
    byCurrency,
    settlement: [...settlement.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
    awaitingSettlement,
    pendingCount,
    unsuccessfulCount,
    supporters: supporters.size,
    usdEquivalent,
  };
}

/** Minor units → "1234.56" (exact, no float rounding), for exports. */
export function minorToDecimal(minor: number | null | undefined): string {
  if (minor == null) return "";
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(minor));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
