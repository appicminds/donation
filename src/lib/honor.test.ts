import { describe, expect, it } from "vitest";
import { isPreset, isValidAmount, parseHonorPrefill } from "./honor";

const q = (s: string) => new URLSearchParams(s);
const both = ["USD", "GBP"] as const;

describe("parseHonorPrefill", () => {
  it("defaults to USD with no amount", () => {
    expect(parseHonorPrefill(q(""), both)).toEqual({ currency: "USD", amount: null });
  });

  it("accepts a valid currency and amount", () => {
    expect(parseHonorPrefill(q("currency=gbp&amount=250"), both)).toEqual({ currency: "GBP", amount: 250 });
  });

  it("falls back to USD when the currency is unsupported or disabled", () => {
    expect(parseHonorPrefill(q("currency=EUR&amount=50"), both).currency).toBe("USD");
    expect(parseHonorPrefill(q("currency=GBP&amount=50"), ["USD"]).currency).toBe("USD");
  });

  it("drops zero, negative, fractional-looking, over-limit and junk amounts", () => {
    for (const amount of ["0", "-5", "12.5", "99999999", "abc", "1e3", "50000"]) {
      expect(parseHonorPrefill(q(`amount=${amount}`), both).amount).toBeNull();
    }
  });
});

describe("amount rules", () => {
  it("validates custom amounts", () => {
    expect(isValidAmount(1)).toBe(true);
    expect(isValidAmount(19.99)).toBe(true);
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(10_001)).toBe(false);
    expect(isValidAmount(1.234)).toBe(false);
  });

  it("recognises presets", () => {
    expect(isPreset("USD", 100)).toBe(true);
    expect(isPreset("GBP", 75)).toBe(false);
    expect(isPreset("USD", null)).toBe(false);
  });
});
