/* ============================================================
 * NEXURA DIY — TIMEFRAME PACING (deterministic floors)
 * The plan may never promise faster than physiology allows.
 * A user asking for 15-kg loss in 1 month gets 84 days minimum
 * and an honest explanation — never a crash plan.
 * ============================================================ */

import { PACING_FLOORS, DEFAULT_DAYS, type DiyCategory } from "../types";

export interface TimeframeResult {
  /** applied timeframe in days (>= floor) */
  days: number;
  requested: number | null;
  floor: number | null;
  wasAdjusted: boolean;
  note?: string;
}

export function applyPacingFloor(
  category: DiyCategory,
  requestedDays: number | null,
): TimeframeResult {
  const floor = PACING_FLOORS[category] ?? null;
  const days = requestedDays ?? floor ?? DEFAULT_DAYS[category] ?? 56;
  if (floor && requestedDays && requestedDays < floor) {
    return {
      days: floor,
      requested: requestedDays,
      floor,
      wasAdjusted: true,
      note: `You asked for ${requestedDays} days — for this goal the safe minimum is about ${Math.round(floor / 7)} weeks, so the plan starts there.`,
    };
  }
  return { days, requested: requestedDays, floor, wasAdjusted: false };
}
