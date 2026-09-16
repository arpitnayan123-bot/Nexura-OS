import { describe, it, expect } from "vitest";
import {
  usdToCents,
  centsToUsd,
  tourismProcedureToWire,
  tourismInquiryToWire,
  TOURISM_PROCEDURE_USD_CENTS,
  TOURISM_INQUIRY_USD_CENTS,
  TOURISM_INQUIRY_INR_PAISE,
} from "@/lib/money";

/* Tourism money (tourism-money-1): integer cents (USD) / paise (INR)
 * storage, major units on the wire — the exact mirror of the rupee/paise
 * rule from the paise migration. Float money must never reach storage. */

describe("USD cents helpers", () => {
  it("usdToCents is exact at classic float traps", () => {
    expect(usdToCents(4500)).toBe(450000);
    expect(usdToCents(19.99)).toBe(1999); // 19.99*100 === 1998.9999… in float
    expect(usdToCents(0.1)).toBe(10); // 0.1 is not representable exactly
    expect(usdToCents(0.29)).toBe(29); // 0.29*100 === 28.999999999999996
    expect(usdToCents(35000)).toBe(3500000);
  });

  it("centsToUsd restores major units exactly", () => {
    expect(centsToUsd(450000)).toBe(4500);
    expect(centsToUsd(1999)).toBe(19.99);
    expect(centsToUsd(5)).toBe(0.05);
  });

  it("round-trips without drift", () => {
    for (const usd of [800, 2200, 2450, 5800, 14000, 19.99, 0.05]) {
      expect(centsToUsd(usdToCents(usd))).toBe(usd);
    }
  });
});

describe("tourism wire mappers", () => {
  it("procedure mapper converts cents to priceUSD and preserves other fields", () => {
    const row = {
      id: "p1",
      hospitalId: "h1",
      name: "CABG",
      category: "cardiac",
      priceUSDCents: 450000,
      description: null,
      avgStayDays: 10,
      active: true,
    };
    const wire = tourismProcedureToWire(row);
    expect(wire).toEqual({ ...row, priceUSD: 4500, priceUSDCents: undefined });
    expect("priceUSDCents" in wire).toBe(false); // storage unit never leaks to the wire
  });

  it("inquiry mapper converts USD cents + INR paise; nulls stay null", () => {
    const row = {
      id: "i1",
      patientName: "Test",
      status: "estimate_sent",
      estimatedCostUSDCents: 580000,
      estimatedCostINRPaise: 48140000,
      totalBilledUSDCents: null,
    };
    const wire = tourismInquiryToWire(row);
    expect(wire.estimatedCostUSD).toBe(5800);
    expect(wire.estimatedCostINR).toBe(481400); // rupees
    expect(wire.totalBilledUSD).toBeNull();
    expect("estimatedCostUSDCents" in wire).toBe(false);
    expect("estimatedCostINRPaise" in wire).toBe(false);
    expect("totalBilledUSDCents" in wire).toBe(false);
  });

  it("field registries cover exactly the money columns that changed", () => {
    expect(TOURISM_PROCEDURE_USD_CENTS).toEqual(["priceUSDCents"]);
    expect(TOURISM_INQUIRY_USD_CENTS).toEqual(["estimatedCostUSDCents", "totalBilledUSDCents"]);
    expect(TOURISM_INQUIRY_INR_PAISE).toEqual(["estimatedCostINRPaise"]);
  });
});
