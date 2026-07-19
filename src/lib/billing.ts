import { createHash } from "crypto";

export type TaxBreakdown = {
  amountCents: number;
  taxBaseCents: number;
  taxCents: number;
  taxRateBasisPoints: number;
};

export type FiscalHashInput = {
  tenantId: string;
  number: string;
  issuedAt: Date;
  amountCents: number;
  taxBaseCents: number;
  taxCents: number;
  receiverTaxId?: string | null;
  previousFiscalHash?: string | null;
};

export type FacturaePreviewInput = {
  invoiceNumber: string;
  issuedAt: Date;
  issuerLegalName: string;
  issuerTaxId: string;
  receiverName: string;
  receiverTaxId: string;
  treatmentName: string;
  tax: TaxBreakdown;
};

export function calculateInvoiceTax(totalCents: number, taxRatePercent: number): TaxBreakdown {
  const amountCents = Math.max(0, Math.round(totalCents));
  const normalizedRate = Math.max(0, taxRatePercent);
  const taxRateBasisPoints = Math.round(normalizedRate * 100);

  if (taxRateBasisPoints === 0 || amountCents === 0) {
    return { amountCents, taxBaseCents: amountCents, taxCents: 0, taxRateBasisPoints };
  }

  const taxBaseCents = Math.round((amountCents * 10000) / (10000 + taxRateBasisPoints));
  return {
    amountCents,
    taxBaseCents,
    taxCents: amountCents - taxBaseCents,
    taxRateBasisPoints
  };
}

export function buildFiscalInvoiceHash(input: FiscalHashInput): string {
  return createHash("sha256")
    .update(
      [
        input.previousFiscalHash ?? "",
        input.tenantId,
        input.number,
        input.issuedAt.toISOString(),
        input.amountCents,
        input.taxBaseCents,
        input.taxCents,
        input.receiverTaxId ?? ""
      ].join("|")
    )
    .digest("hex");
}

export function buildQrPayload(input: {
  issuerTaxId?: string | null;
  number: string;
  issuedAt: Date;
  amountCents: number;
}): string {
  const params = new URLSearchParams({
    nif: input.issuerTaxId ?? "",
    numserie: input.number,
    fecha: input.issuedAt.toISOString().slice(0, 10),
    importe: (input.amountCents / 100).toFixed(2)
  });
  return `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?${params.toString()}`;
}

export function buildFacturaePreviewXml(input: FacturaePreviewInput): string {
  const issueDate = input.issuedAt.toISOString().slice(0, 10);
  const taxRate = (input.tax.taxRateBasisPoints / 100).toFixed(2);
  const taxBase = centsToXmlAmount(input.tax.taxBaseCents);
  const taxAmount = centsToXmlAmount(input.tax.taxCents);
  const total = centsToXmlAmount(input.tax.amountCents);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<FacturaePreview version="3.2.2">',
    `  <InvoiceNumber>${escapeXml(input.invoiceNumber)}</InvoiceNumber>`,
    `  <IssueDate>${issueDate}</IssueDate>`,
    "  <SellerParty>",
    `    <TaxIdentificationNumber>${escapeXml(input.issuerTaxId)}</TaxIdentificationNumber>`,
    `    <CorporateName>${escapeXml(input.issuerLegalName)}</CorporateName>`,
    "  </SellerParty>",
    "  <BuyerParty>",
    `    <TaxIdentificationNumber>${escapeXml(input.receiverTaxId)}</TaxIdentificationNumber>`,
    `    <CorporateName>${escapeXml(input.receiverName)}</CorporateName>`,
    "  </BuyerParty>",
    "  <Items>",
    "    <InvoiceLine>",
    `      <ItemDescription>${escapeXml(input.treatmentName)}</ItemDescription>`,
    `      <TaxRate>${taxRate}</TaxRate>`,
    `      <TaxableBase>${taxBase}</TaxableBase>`,
    `      <TaxAmount>${taxAmount}</TaxAmount>`,
    `      <GrossAmount>${total}</GrossAmount>`,
    "    </InvoiceLine>",
    "  </Items>",
    `  <InvoiceTotal>${total}</InvoiceTotal>`,
    "</FacturaePreview>"
  ].join("\n");
}

function centsToXmlAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
