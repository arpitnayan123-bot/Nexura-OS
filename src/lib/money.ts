/* Canonical money helpers — the single conversion boundary between
   integer-paise storage (all money columns) and rupee numbers at the
   API/serialization edge.

   INVARIANTS (docs/ARCHITECTURE.md §5):
   - Storage and arithmetic are ALWAYS integer paise. No float +/-/* on money.
   - GST/percentage math: Math.round(basePaise * ratePct / 100) — the only
     rounding step, deterministic, no accumulated float error.
   - Rates (cgstRate, sgstRate, gstRate, discountPct) stay Float PERCENTAGES —
     India has 0.25% GST slabs, so rates must not become integers.
   - API responses serialize paise -> rupees (paiseToRupee) so the wire
     contract and the product UI are unchanged. Request payloads accept
     rupees (rupeeToPaise) at the boundary, exactly as before.
   - Paise integers are Int (max ₹2,14,74,836.47 per value) — the same
     convention the Nx layer has always used.

   USD money (tourism/global desk, tourism-money-1): integer CENTS storage,
   USD major units on the wire — the exact mirror of the rupee/paise rule.
   Exchange rates (usdInrRate) remain floats: they are RATES, not money. */

/** Rupees (float, wire/display unit) -> paise (integer, storage unit). */
export function rupeeToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Paise (integer, storage unit) -> rupees (number, wire/display unit). */
export function paiseToRupee(paise: number): number {
  return paise / 100;
}

/** GST/percentage of a paise base: integer result, nearest-paise rounding.
    ratePct is a Float percentage (e.g. 6, 12, 0.25). */
export function gstOnPaise(basePaise: number, ratePct: number): number {
  return Math.round((basePaise * ratePct) / 100);
}

/** Round a paise amount to the nearest whole rupee (invoice-total rounding,
    preserves the legacy `Math.round(grandRupees)` behaviour). */
export function roundToRupee(paise: number): number {
  return Math.round(paise / 100) * 100;
}

/* ---- USD: integer cents storage, USD major units on the wire ---- */

/** USD (float, wire/display unit) -> cents (integer, storage unit). */
export function usdToCents(usd: number): number {
  return Math.round(usd * 100);
}

/** Cents (integer, storage unit) -> USD (number, wire/display unit). */
export function centsToUsd(cents: number): number {
  return cents / 100;
}

/* ---- serialization: convert a known set of paise fields to rupees ---- */

type Money = Record<string, unknown>;

/** Copy `obj`, converting the named paise fields to rupee numbers.
    Fields that are null stay null; non-numeric fields are left untouched. */
export function toRupees<T extends Money>(obj: T, paiseFields: readonly string[]): T {
  const out: Money = { ...obj };
  for (const f of paiseFields) {
    const v = out[f];
    if (typeof v === "number") out[f] = paiseToRupee(v);
  }
  return out as T;
}

/** Convert an array's rows (and optionally a nested list field) to rupees. */
export function toRupeesAll<T extends Money>(rows: T[], paiseFields: readonly string[]): T[] {
  return rows.map((r) => toRupees(r, paiseFields));
}

/* ---- field registries (single source of truth for every serializer) ---- */

export const SALE_PAISE = ["subtotal", "discount", "cgst", "sgst", "roundOff", "total"] as const;
export const SALE_ITEM_PAISE = ["mrpPerStrip", "discount", "lineTotal"] as const;
export const BATCH_PAISE = ["mrp", "purchaseRate"] as const;
export const PURCHASE_PAISE = ["total", "paidAmount"] as const;
export const PURCHASE_ITEM_PAISE = ["mrp", "purchaseRate", "lineTotal"] as const;
export const NEAR_EXPIRY_RETURN_PAISE = ["cgst", "sgst", "total"] as const;
export const NEAR_EXPIRY_RETURN_ITEM_PAISE = ["mrp", "lineTotal"] as const;
export const DAY_CLOSING_PAISE = [
  "cashSales",
  "upiSales",
  "cardSales",
  "creditSales",
  "totalSales",
  "cgstCollected",
  "sgstCollected",
  "totalGst",
  "totalPurchases",
  "totalDiscount",
  "netProfit",
] as const;
export const AMOUNT_PAISE = ["amount"] as const; // SupplierPayment, CustomerPayment, ClinicInvoice-style
export const CREDIT_LIMIT_PAISE = ["creditLimit"] as const;
export const HOSPITAL_BILL_PAISE = [
  "subtotal",
  "discount",
  "cgst",
  "sgst",
  "totalPayable",
] as const;
export const INSURANCE_CLAIM_PAISE = ["estimatedCost", "approvedAmount", "patientCopay"] as const;
export const CLINIC_INVOICE_PAISE = ["amount", "discount", "total"] as const;
export const CONSULT_FEE_PAISE = ["consultationFee"] as const; // HospitalDoctor
export const FEE_CONSULT_PAISE = ["feeConsult"] as const; // ClinicDoctor
export const NPPA_CEILING_PAISE = ["nppaCeilingPrice"] as const; // HospitalMedicine
export const NX_INSURANCE_PAISE = ["payoutTotal", "settledAmount"] as const;

/* USD cents field registries (tourism/global desk). */
export const TOURISM_PROCEDURE_USD_CENTS = ["priceUSDCents"] as const;
export const TOURISM_INQUIRY_USD_CENTS = ["estimatedCostUSDCents", "totalBilledUSDCents"] as const;
export const TOURISM_INQUIRY_INR_PAISE = ["estimatedCostINRPaise"] as const;

/** TourismProcedure storage row -> wire shape (priceUSD in major units).
 *  Every other field passes through untouched. */
export function tourismProcedureToWire<T extends { priceUSDCents: number } & Money>(p: T) {
  const { priceUSDCents, ...rest } = p;
  return { ...rest, priceUSD: centsToUsd(priceUSDCents) };
}

/** TourismInquiry storage row -> wire shape (USD major / INR rupees).
 *  Null money stays null; every other field passes through untouched. */
export function tourismInquiryToWire<T extends Money>(i: T) {
  const { estimatedCostUSDCents, estimatedCostINRPaise, totalBilledUSDCents, ...rest } = i;
  return {
    ...rest,
    estimatedCostUSD:
      estimatedCostUSDCents == null ? null : centsToUsd(estimatedCostUSDCents as number),
    estimatedCostINR:
      estimatedCostINRPaise == null ? null : paiseToRupee(estimatedCostINRPaise as number),
    totalBilledUSD: totalBilledUSDCents == null ? null : centsToUsd(totalBilledUSDCents as number),
  };
}

/** Sale + nested items (the pharmacy billing response shape). */
export function saleWithItemsToRupees<S extends Money & { items?: Money[] }>(sale: S): S {
  const out = toRupees(sale, SALE_PAISE);
  if (Array.isArray(out.items)) {
    out.items = out.items.map((it) => toRupees(it, SALE_ITEM_PAISE));
  }
  return out as S;
}
