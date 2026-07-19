import { describe, expect, it } from "vitest";
import { buildFiscalInvoiceHash, calculateInvoiceTax } from "@/lib/billing";

describe("billing fiscal helpers", () => {
  it("treats zero tax rate as exempt or not subject without changing the gross total", () => {
    expect(calculateInvoiceTax(5500, 0)).toEqual({
      amountCents: 5500,
      taxBaseCents: 5500,
      taxCents: 0,
      taxRateBasisPoints: 0
    });
  });

  it("splits a tax-included total into taxable base and tax amount", () => {
    expect(calculateInvoiceTax(12100, 21)).toEqual({
      amountCents: 12100,
      taxBaseCents: 10000,
      taxCents: 2100,
      taxRateBasisPoints: 2100
    });
  });

  it("changes the fiscal hash when the previous hash changes", () => {
    const issuedAt = new Date("2026-07-15T10:00:00.000Z");
    const base = {
      tenantId: "tenant_1",
      number: "F-2026-001",
      issuedAt,
      amountCents: 12100,
      taxBaseCents: 10000,
      taxCents: 2100,
      receiverTaxId: "B00000000"
    };

    expect(buildFiscalInvoiceHash({ ...base, previousFiscalHash: "a" })).not.toBe(
      buildFiscalInvoiceHash({ ...base, previousFiscalHash: "b" })
    );
  });
});
