import type { Payload, Where } from "payload";
import type { Payment } from "@/payload-types";
import { summarise, type DateRange, type FinanceSummary, type FxBasis, type PaymentRow } from "./report";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Accept only well-formed YYYY-MM-DD dates from the query string. */
export function parseRange(params: { from?: string | null; to?: string | null }): DateRange {
  const ok = (v?: string | null) => (v && DAY.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined);
  return { from: ok(params.from), to: ok(params.to) };
}

export async function loadFinance(
  payload: Payload,
  range: DateRange,
): Promise<{ payments: Payment[]; summary: FinanceSummary; fx: FxBasis | null }> {
  const and: Where[] = [];
  if (range.from) and.push({ createdAt: { greater_than_equal: `${range.from}T00:00:00.000Z` } });
  if (range.to) and.push({ createdAt: { less_than_equal: `${range.to}T23:59:59.999Z` } });

  const [{ docs }, settings] = await Promise.all([
    payload.find({
      collection: "payments",
      where: and.length ? { and } : undefined,
      pagination: false,
      overrideAccess: true,
      depth: 0,
      sort: "-createdAt",
    }),
    payload.findGlobal({ slug: "site-settings", overrideAccess: true, depth: 0 }),
  ]);

  const fx: FxBasis | null =
    settings.gbpToUsdRate && settings.fxRateSource && settings.fxRateAsOf
      ? { gbpToUsd: settings.gbpToUsdRate, source: settings.fxRateSource, asOf: settings.fxRateAsOf.slice(0, 10) }
      : null;

  const rows: PaymentRow[] = docs.map((p) => ({
    receiptRef: p.receiptRef,
    status: p.status,
    currency: p.currency,
    amountMinor: p.amountMinor,
    refundedMinor: p.refundedMinor,
    donorEmail: p.donorEmail,
    createdAt: p.createdAt,
    succeededAt: p.succeededAt,
    settlementCurrency: p.settlementCurrency,
    grossMinor: p.grossMinor,
    feeMinor: p.feeMinor,
    netMinor: p.netMinor,
    disputeStatus: p.disputeStatus,
  }));
  return { payments: docs, summary: summarise(rows, fx), fx };
}
