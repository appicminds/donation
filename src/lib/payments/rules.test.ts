import { describe, expect, it } from "vitest";
import { newAccessToken, newReceiptRef, nextStatus, refundStatus, tokensMatch, validateHonorAmount } from "./rules";

const both = ["USD", "GBP"] as const;
const limits = { min: 1, max: 10_000 };

describe("validateHonorAmount", () => {
  it("accepts presets and custom amounts, in minor units", () => {
    expect(validateHonorAmount("USD", "50", both, limits)).toEqual({ ok: true, amountMinor: 5000, currency: "USD" });
    expect(validateHonorAmount("GBP", "1000", both, limits)).toEqual({
      ok: true,
      amountMinor: 100000,
      currency: "GBP",
    });
    expect(validateHonorAmount("USD", "19.99", both, limits)).toEqual({ ok: true, amountMinor: 1999, currency: "USD" });
    expect(validateHonorAmount("USD", "7.5", both, limits)).toMatchObject({ amountMinor: 750 });
  });

  it("rejects zero, negative, over-limit, malformed and unsupported values (PRD §16.2)", () => {
    for (const bad of ["0", "-5", "0.5", "10000.01", "abc", "1e3", "12.345", "", " ", "NaN", "Infinity", "1,000"]) {
      expect(validateHonorAmount("USD", bad, both, limits).ok, bad).toBe(false);
    }
  });

  it("rejects currencies that are unknown or switched off", () => {
    expect(validateHonorAmount("EUR", "50", both, limits)).toMatchObject({ ok: false, field: "currency" });
    expect(validateHonorAmount("GBP", "50", ["USD"], limits)).toMatchObject({ ok: false, field: "currency" });
  });

  it("uses the configured limits", () => {
    expect(validateHonorAmount("USD", "5", both, { min: 10, max: 500 }).ok).toBe(false);
    expect(validateHonorAmount("USD", "750", both, { min: 10, max: 500 }).ok).toBe(false);
    expect(validateHonorAmount("USD", "20", both, { min: 10, max: 500 }).ok).toBe(true);
  });
});

describe("ledger transitions", () => {
  it("moves forward only", () => {
    expect(nextStatus("requires_payment", "processing")).toBe("processing");
    expect(nextStatus("processing", "succeeded")).toBe("succeeded");
    expect(nextStatus("succeeded", "processing")).toBe("succeeded");
    expect(nextStatus("succeeded", "failed")).toBe("succeeded");
    expect(nextStatus("refunded", "succeeded")).toBe("refunded");
  });

  it("allows a retry after a failed attempt", () => {
    expect(nextStatus("failed", "processing")).toBe("processing");
    expect(nextStatus("failed", "succeeded")).toBe("succeeded");
  });

  it("returns from a closed dispute", () => {
    expect(nextStatus("succeeded", "disputed")).toBe("disputed");
    expect(nextStatus("disputed", "succeeded")).toBe("succeeded");
  });

  it("derives refund status from cumulative refunds", () => {
    expect(refundStatus(5000, 0)).toBe("succeeded");
    expect(refundStatus(5000, 1000)).toBe("partially_refunded");
    expect(refundStatus(5000, 5000)).toBe("refunded");
  });
});

describe("references", () => {
  it("creates readable receipt references and long tokens", () => {
    expect(newReceiptRef()).toMatch(/^CK-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    expect(newReceiptRef()).not.toBe(newReceiptRef());
    expect(newAccessToken().length).toBeGreaterThanOrEqual(32);
  });

  it("compares tokens safely", () => {
    const t = newAccessToken();
    expect(tokensMatch(t, t)).toBe(true);
    expect(tokensMatch(t, `${t}x`)).toBe(false);
    expect(tokensMatch(t, null)).toBe(false);
  });
});
