import { describe, expect, it } from "vitest";
import { formatMoney, isCurrency, PRESET_AMOUNTS, sumMoney, toMinor } from "./money";

describe("money", () => {
  it("formats USD and GBP whole amounts without decimals", () => {
    expect(formatMoney({ amountMinor: 100000, currency: "USD" })).toBe("$1,000");
    expect(formatMoney({ amountMinor: 2000, currency: "GBP" })).toBe("£20");
  });

  it("keeps decimals for fractional amounts", () => {
    expect(formatMoney({ amountMinor: 2050, currency: "USD" })).toBe("$20.50");
  });

  it("rejects non-integer minor units", () => {
    expect(() => formatMoney({ amountMinor: 10.5, currency: "USD" })).toThrow();
  });

  it("converts to minor units without float drift", () => {
    expect(toMinor(19.99)).toBe(1999);
    expect(toMinor(0.1 + 0.2)).toBe(30);
    expect(() => toMinor(Number.NaN)).toThrow();
  });

  it("validates currency codes", () => {
    expect(isCurrency("USD")).toBe(true);
    expect(isCurrency("GBP")).toBe(true);
    expect(isCurrency("EUR")).toBe(false);
    expect(isCurrency(undefined)).toBe(false);
  });

  it("never sums mixed currencies", () => {
    expect(
      sumMoney(
        [
          { amountMinor: 500, currency: "USD" },
          { amountMinor: 250, currency: "USD" },
        ],
        "USD",
      ),
    ).toEqual({ amountMinor: 750, currency: "USD" });
    expect(() =>
      sumMoney(
        [
          { amountMinor: 500, currency: "USD" },
          { amountMinor: 250, currency: "GBP" },
        ],
        "USD",
      ),
    ).toThrow(/Cannot sum GBP/);
  });

  it("uses the PRD presets for both currencies", () => {
    expect(PRESET_AMOUNTS.USD).toEqual([20, 50, 100, 250, 500, 1000]);
    expect(PRESET_AMOUNTS.GBP).toEqual([20, 50, 100, 250, 500, 1000]);
  });
});
