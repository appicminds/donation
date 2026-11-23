import { describe, expect, it } from "vitest";
import { inRange, minorToDecimal, summarise, type PaymentRow } from "./report";

const row = (p: Partial<PaymentRow>): PaymentRow => ({
  receiptRef: "CK-TEST-0000",
  status: "succeeded",
  currency: "USD",
  amountMinor: 5000,
  refundedMinor: 0,
  donorEmail: "a@example.test",
  createdAt: "2026-11-20T10:00:00.000Z",
  ...p,
});

describe("summarise", () => {
  const rows: PaymentRow[] = [
    row({ amountMinor: 5000, settlementCurrency: "AED", grossMinor: 18363, feeMinor: 1000, netMinor: 17363 }),
    row({ amountMinor: 10000, refundedMinor: 2500, status: "partially_refunded", donorEmail: "A@Example.test " }),
    row({
      currency: "GBP",
      amountMinor: 2000,
      donorEmail: "b@example.test",
      settlementCurrency: "AED",
      grossMinor: 9647,
      feeMinor: 600,
      netMinor: 9047,
    }),
    row({ currency: "GBP", amountMinor: 1000, status: "refunded", refundedMinor: 1000, donorEmail: "c@example.test" }),
    row({ currency: "GBP", amountMinor: 3000, status: "disputed", donorEmail: "d@example.test" }),
    row({ status: "processing" }),
    row({ status: "requires_payment" }),
    row({ status: "failed" }),
    row({ status: "canceled" }),
  ];

  it("keeps each charge currency separate and never sums USD with GBP", () => {
    const s = summarise(rows, null);
    expect(s.byCurrency.USD).toMatchObject({
      successfulCount: 2,
      grossMinor: 15000,
      refundedMinor: 2500,
      netOfRefundsMinor: 12500,
    });
    expect(s.byCurrency.GBP).toMatchObject({
      successfulCount: 3,
      grossMinor: 6000,
      refundedMinor: 1000,
      netOfRefundsMinor: 5000,
      disputedCount: 1,
      disputedMinor: 3000,
    });
    expect(s.usdEquivalent).toBeNull();
  });

  it("reports fees and net per settlement currency, and flags payments awaiting settlement", () => {
    const s = summarise(rows, null);
    expect(s.settlement).toEqual([{ currency: "AED", count: 2, grossMinor: 28010, feeMinor: 1600, netMinor: 26410 }]);
    expect(s.awaitingSettlement).toBe(3);
  });

  it("counts pending and unsuccessful payments for monitoring", () => {
    const s = summarise(rows, null);
    expect(s.pendingCount).toBe(2);
    expect(s.unsuccessfulCount).toBe(2);
  });

  it("counts distinct known supporters case-insensitively", () => {
    expect(summarise(rows, null).supporters).toBe(4);
  });

  it("gives a USD equivalent only with an explicit, documented rate", () => {
    const s = summarise(rows, { gbpToUsd: 1.25, source: "ECB reference rate", asOf: "2026-11-20" });
    expect(s.usdEquivalent).toEqual({
      totalMinor: 12500 + 6250,
      basis: { gbpToUsd: 1.25, source: "ECB reference rate", asOf: "2026-11-20" },
    });
  });
});

describe("helpers", () => {
  it("filters by UTC date, inclusive", () => {
    const r = { createdAt: "2026-11-20T23:59:59.000Z" };
    expect(inRange(r, { from: "2026-11-20", to: "2026-11-20" })).toBe(true);
    expect(inRange(r, { from: "2026-11-21" })).toBe(false);
    expect(inRange(r, { to: "2026-11-19" })).toBe(false);
    expect(inRange(r, {})).toBe(true);
  });

  it("formats minor units exactly", () => {
    expect(minorToDecimal(123456)).toBe("1234.56");
    expect(minorToDecimal(5)).toBe("0.05");
    expect(minorToDecimal(-250)).toBe("-2.50");
    expect(minorToDecimal(null)).toBe("");
  });
});
