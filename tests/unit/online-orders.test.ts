import { describe, it, expect } from "vitest";
import {
  ONLINE_ORDER_STATUSES,
  canTransition,
  nextActions,
  isTerminalStatus,
  isOnlineOrderStatus,
  normalizeDrugName,
  matchCatalogItem,
  estimateTotalPaise,
  generateOrderNo,
  type CatalogCandidate,
} from "@/lib/pharmacy/online-orders";

/* Online-order domain rules:
 *  - state machine allows forward flow + cancel-until-dispatch, terminals closed;
 *  - catalog matching is deterministic (exact > generic > containment);
 *  - money math is integer paise with hostile-input floors;
 *  - order numbers are unique-shaped without a count+1 race. */

const CATALOG: CatalogCandidate[] = [
  { id: "p1", name: "Dolo 650", genericName: "Paracetamol 650mg", unitMrp: 2450 },
  { id: "p2", name: "Azithral 500", genericName: "Azithromycin", unitMrp: 11800 },
  { id: "p3", name: "Metformin 500 SR", genericName: null, unitMrp: 5300 },
];

describe("online-order state machine", () => {
  it("allows the full forward fulfilment flow", () => {
    expect(canTransition("pending_review", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "preparing")).toBe(true);
    expect(canTransition("preparing", "ready")).toBe(true);
    expect(canTransition("ready", "out_for_delivery")).toBe(true);
    expect(canTransition("out_for_delivery", "delivered")).toBe(true);
  });

  it("allows cancellation until dispatch, never after", () => {
    expect(canTransition("pending_review", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("preparing", "cancelled")).toBe(true);
    expect(canTransition("out_for_delivery", "cancelled")).toBe(false);
    expect(canTransition("delivered", "cancelled")).toBe(false);
  });

  it("blocks skipping and reversing", () => {
    expect(canTransition("pending_review", "preparing")).toBe(false);
    expect(canTransition("pending_review", "delivered")).toBe(false);
    expect(canTransition("confirmed", "ready")).toBe(false);
    expect(canTransition("preparing", "confirmed")).toBe(false);
    expect(canTransition("delivered", "preparing")).toBe(false);
  });

  it("marks delivered and cancelled as the only terminals", () => {
    for (const s of ONLINE_ORDER_STATUSES) {
      expect(isTerminalStatus(s)).toBe(s === "delivered" || s === "cancelled");
    }
  });

  it("nextActions mirrors the transition table", () => {
    expect(nextActions("pending_review")).toEqual(["confirmed", "cancelled"]);
    expect(nextActions("ready")).toEqual(["out_for_delivery", "delivered"]);
    expect(nextActions("delivered")).toEqual([]);
  });

  it("rejects unknown statuses at the type guard", () => {
    expect(isOnlineOrderStatus("confirmed")).toBe(true);
    expect(isOnlineOrderStatus("shipped")).toBe(false);
    expect(isOnlineOrderStatus(null)).toBe(false);
    expect(isOnlineOrderStatus(42)).toBe(false);
  });
});

describe("catalog matching", () => {
  it("normalizes case, punctuation and spacing", () => {
    expect(normalizeDrugName("Dolo-650  ")).toBe("dolo 650");
    expect(normalizeDrugName("  DOLO   650!")).toBe("dolo 650");
  });

  it("matches exact brand, then generic, then containment", () => {
    expect(matchCatalogItem("Dolo 650", CATALOG)?.productId).toBe("p1");
    expect(matchCatalogItem("Paracetamol 650mg", CATALOG)?.productId).toBe("p1");
    expect(matchCatalogItem("dolo", CATALOG)?.productId).toBe("p1");
    expect(matchCatalogItem("Azithromycin", CATALOG)?.productId).toBe("p2");
  });

  it("prefers exact brand over a longer containment candidate", () => {
    const catalog: CatalogCandidate[] = [
      { id: "wide", name: "Dolo 650 Plus", unitMrp: 100 },
      { id: "exact", name: "Dolo 650", unitMrp: 200 },
    ];
    expect(matchCatalogItem("dolo 650", catalog)?.productId).toBe("exact");
  });

  it("returns null for empty/noise input and misses", () => {
    expect(matchCatalogItem("", CATALOG)).toBeNull();
    expect(matchCatalogItem("   ", CATALOG)).toBeNull();
    expect(matchCatalogItem("Viagra superforce", CATALOG)).toBeNull();
    expect(matchCatalogItem("Crocin", CATALOG)).toBeNull();
  });
});

describe("money (integer paise)", () => {
  it("sums qty × mrp exactly", () => {
    expect(estimateTotalPaise([{ qtyStrips: 2, unitMrp: 2450 }, { qtyStrips: 1, unitMrp: 11800 }])).toBe(16700);
  });

  it("unmatched lines (mrp 0) contribute nothing", () => {
    expect(estimateTotalPaise([{ qtyStrips: 3, unitMrp: 0 }, { qtyStrips: 1, unitMrp: 2450 }])).toBe(2450);
  });

  it("floors hostile/non-numeric input instead of NaN-ing the quote", () => {
    expect(estimateTotalPaise([{ qtyStrips: NaN, unitMrp: 2450 }])).toBe(0);
    expect(estimateTotalPaise([{ qtyStrips: 2.9, unitMrp: -5 }])).toBe(0);
    expect(estimateTotalPaise([{ qtyStrips: Infinity, unitMrp: 2450 }])).toBe(0);
  });
});

describe("order numbers", () => {
  it("has the ONL-YYMMDD-XXXX shape", () => {
    const no = generateOrderNo(new Date(2026, 8, 19));
    expect(no).toMatch(/^ONL-\d{6}-[0-9A-Z]{4}$/);
    expect(no.startsWith("ONL-260919-")).toBe(true);
  });

  it("is effectively collision-free across a large batch", () => {
    const set = new Set(Array.from({ length: 5000 }, () => generateOrderNo(new Date(2026, 8, 19))));
    expect(set.size).toBeGreaterThan(4990);
  });
});
