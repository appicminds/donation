import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import type { Payment } from "@/payload-types";
import { safeCell, toCsv, toXlsx } from "./export";
import { parseRange } from "./load";
import { summarise } from "./report";

const payment = (p: Partial<Payment>): Payment =>
  ({
    id: 1,
    receiptRef: "CK-ABCD-EFGH",
    accessToken: "x",
    status: "succeeded",
    amountMinor: 5000,
    currency: "GBP",
    refundedMinor: 1000,
    donorEmail: "donor@example.test",
    donorName: '=HYPERLINK("http://evil")',
    showName: false,
    settlementCurrency: "AED",
    grossMinor: 24119,
    feeMinor: 1346,
    netMinor: 22773,
    fxRate: 4.82376,
    stripePaymentIntentId: "pi_123",
    createdAt: "2026-11-23T09:38:00.000Z",
    updatedAt: "2026-11-23T09:38:00.000Z",
    succeededAt: "2026-11-23T09:38:30.000Z",
    ...p,
  }) as Payment;

const meta = {
  range: { from: "2026-11-01", to: "2026-11-30" },
  generatedAt: new Date("2026-11-23T12:00:00.000Z"),
  generatedBy: "finance@example.test",
  fx: { gbpToUsd: 1.27, source: "ECB reference rate", asOf: "2026-11-22" },
};

describe("CSV export", () => {
  const csv = toCsv(
    [
      payment({}),
      payment({
        id: 2,
        receiptRef: "CK-USD0-0001",
        currency: "USD",
        amountMinor: 2000,
        refundedMinor: 0,
        donorName: 'Ama, "Auntie"',
      }),
    ],
    meta,
  );
  const lines = csv.split("\r\n");

  it("states the range, author and FX basis", () => {
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("2026-11-01 to 2026-11-30");
    expect(csv).toContain("finance@example.test");
    expect(csv).toContain("1 GBP = 1.27 USD (ECB reference rate, 2026-11-22)");
  });

  it("keeps USD and GBP in separate columns with exact decimals", () => {
    const header = lines[7].split(",");
    const gbpRow = lines[8].split(",");
    const usdRow = lines[9].split(",");
    const col = (name: string) => header.indexOf(name);
    expect(gbpRow[col("GBP amount")]).toBe("50.00");
    expect(gbpRow[col("USD amount")]).toBe("");
    expect(gbpRow[col("Amount less refunds (charge currency)")]).toBe("40.00");
    expect(gbpRow[col("Processing fee")]).toBe("13.46");
    expect(gbpRow[col("Settlement currency")]).toBe("AED");
    expect(usdRow[col("USD amount")]).toBe("20.00");
    expect(usdRow[col("GBP amount")]).toBe("");
  });

  it("leaves collected-money columns blank for payments that collected nothing", () => {
    const failed = toCsv(
      [
        payment({
          status: "failed",
          refundedMinor: 0,
          settlementCurrency: null,
          grossMinor: null,
          feeMinor: null,
          netMinor: null,
        }),
      ],
      meta,
    );
    const [header, row] = failed
      .split("\r\n")
      .slice(7, 9)
      .map((l) => l.split(","));
    expect(row[header.indexOf("GBP amount")]).toBe("50.00");
    expect(row[header.indexOf("Amount less refunds (charge currency)")]).toBe("");
    expect(row[header.indexOf("Refunded (charge currency)")]).toBe("");
  });

  it("neutralises formula injection and quotes awkward text", () => {
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain(`"Ama, ""Auntie"""`);
    expect(safeCell("+1")).toBe("'+1");
    expect(safeCell("@sum")).toBe("'@sum");
    expect(safeCell("Ama")).toBe("Ama");
  });
});

describe("XLSX export", () => {
  it("produces a workbook with Summary and Payments sheets", async () => {
    const payments = [payment({})];
    const summary = summarise(
      payments.map((p) => ({ ...p, currency: p.currency, status: p.status })),
      meta.fx,
    );
    const buf = await toXlsx(payments, summary, meta);
    const files = unzipSync(new Uint8Array(buf));
    const workbook = strFromU8(files["xl/workbook.xml"]);
    expect(workbook).toContain('name="Summary"');
    expect(workbook).toContain('name="Payments"');
    const strings = strFromU8(files["xl/sharedStrings.xml"] ?? new Uint8Array());
    expect(strings).toContain("CK-ABCD-EFGH");
    // Untrusted text is stored as a plain string, never as a formula.
    expect(strings).toContain("=HYPERLINK");
    const sheets = Object.keys(files).filter((f) => f.startsWith("xl/worksheets/sheet"));
    for (const f of sheets) expect(strFromU8(files[f])).not.toContain("<f>");
  });
});

describe("parseRange", () => {
  it("accepts only YYYY-MM-DD", () => {
    expect(parseRange({ from: "2026-11-01", to: "2026-11-30" })).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(parseRange({ from: "yesterday", to: "2026-13-45" })).toEqual({ from: undefined, to: undefined });
    expect(parseRange({ from: "2026-11-01'; drop table payments;--" })).toEqual({ from: undefined, to: undefined });
  });
});
