/* ============================================================
   NEXURA PHARMACY — ONLINE ORDER DOMAIN (pure, unit-testable)
   State machine + catalog matching + integer-paise math for
   /api/pharmacy/online-orders. No DB / IO here — the routes own
   persistence, this module owns the rules.
   ============================================================ */

export const ONLINE_ORDER_STATUSES = [
  "pending_review",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OnlineOrderStatus = (typeof ONLINE_ORDER_STATUSES)[number];

/**
 * Allowed status transitions. Cancellation is allowed until the parcel
 * is out for delivery; `delivered` and `cancelled` are terminal.
 */
const TRANSITIONS: Record<OnlineOrderStatus, readonly OnlineOrderStatus[]> = {
  pending_review: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function isOnlineOrderStatus(v: unknown): v is OnlineOrderStatus {
  return typeof v === "string" && (ONLINE_ORDER_STATUSES as readonly string[]).includes(v);
}

export function canTransition(from: OnlineOrderStatus, to: OnlineOrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextActions(from: OnlineOrderStatus): OnlineOrderStatus[] {
  return [...TRANSITIONS[from]];
}

export function isTerminalStatus(s: OnlineOrderStatus): boolean {
  return TRANSITIONS[s].length === 0;
}

/* ---------- catalog matching ---------- */

/** Lowercase, keep [a-z0-9] + spaces collapsed — "Dolo-650  " → "dolo 650". */
export function normalizeDrugName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface CatalogCandidate {
  id: string;
  name: string;
  genericName?: string | null;
  /** MRP per strip/unit in paise (cheapest in-date batch at the branch). */
  unitMrp: number;
}

export interface CatalogMatch {
  productId: string;
  unitMrp: number;
}

/**
 * Match a free-text (often OCR-extracted) medicine name to the branch
 * catalog. Deterministic: exact normalized name wins, then generic-name
 * equality, then bidirectional containment — closest name length wins ties.
 * Returns null when nothing plausible matches (the item stays unmatched
 * and a pharmacist resolves it during review).
 */
export function matchCatalogItem(
  rawName: string,
  catalog: CatalogCandidate[],
): CatalogMatch | null {
  const q = normalizeDrugName(rawName);
  if (!q || catalog.length === 0) return null;

  let best: { candidate: CatalogCandidate; score: number } | null = null;
  for (const c of catalog) {
    const n = normalizeDrugName(c.name);
    const g = c.genericName ? normalizeDrugName(c.genericName) : "";
    let score = 0;
    if (n === q) score = 100;
    else if (g && g === q) score = 90;
    else if (n.includes(q) || q.includes(n)) score = 70 - Math.abs(n.length - q.length) * 0.1;
    else if (g && (g.includes(q) || q.includes(g)))
      score = 60 - Math.abs(g.length - q.length) * 0.1;
    if (score > 0 && (!best || score > best.score)) best = { candidate: c, score };
  }
  if (!best || best.score <= 0) return null;
  return { productId: best.candidate.id, unitMrp: best.candidate.unitMrp };
}

/* ---------- money (integer paise only) ---------- */

export interface OrderQuoteLine {
  qtyStrips: number;
  unitMrp: number; // paise, 0 when unmatched
}

/** Catalog-MRP quote in paise. Unmatched lines contribute 0 (priced at review). */
export function estimateTotalPaise(lines: OrderQuoteLine[]): number {
  return lines.reduce((sum, l) => {
    const qty = Number.isFinite(l.qtyStrips) ? Math.max(0, Math.floor(l.qtyStrips)) : 0;
    const mrp = Number.isFinite(l.unitMrp) ? Math.max(0, Math.floor(l.unitMrp)) : 0;
    return sum + qty * mrp;
  }, 0);
}

/* ---------- order numbers ---------- */

/** ONL-YYMMDD-XXXX (base36, uppercase) — unique without a count+1 race. */
export function generateOrderNo(now: Date = new Date()): string {
  const y = String(now.getFullYear()).slice(2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  return `ONL-${y}${m}${d}-${rand}`;
}
