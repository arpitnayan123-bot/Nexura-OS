/* ============================================================
   NEXURA SITE — HEALTH STATS DERIVATIONS (pure, unit-testable)
   The homepage "live operating room" preview polls
   /api/health-stats. Previously that endpoint was a synthetic
   sine generator. The route now aggregates REAL data
   (NxWearableSample + HospitalVital); this module holds the
   pure math so it stays unit-tested and the route stays thin.

   Honesty contract: every number is either (a) measured —
   sourced from a device/vital row, (b) derived — computed from
   a measured number by a fixed formula, or (c) demo — a
   deterministic placeholder clearly labelled source:"demo".
   Fields with no data source at all (hydration) are null in
   db mode — never silently invented.
   ============================================================ */

export interface HourlyPoint {
  t: string;
  v: number;
}

/** Mean of a numeric list; null when empty. */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Stress (0-100, lower is calmer) from HRV (rmssd, ms).
 * Fixed linear map: 70ms → 0, 15ms → 84, clamped.
 */
export function deriveStressFromHrv(hrv: number): number {
  const stress = 84 - ((hrv - 15) * 84) / 55;
  return Math.round(Math.min(100, Math.max(0, stress)));
}

/** Fallback stress from resting HR when no HRV: 55bpm → 0, 95bpm → 88. */
export function deriveStressFromRestingHr(hr: number): number {
  const stress = ((hr - 55) * 88) / 40;
  return Math.round(Math.min(100, Math.max(0, stress)));
}

/** Mood index (0-100) mirrors stress with a floor of 30 so the ring stays readable. */
export function deriveMood(stress: number): number {
  return Math.round(Math.min(100, Math.max(30, 100 - stress * 0.7)));
}

/**
 * Active energy burn from step count (fixed walking economy:
 * ≈0.045 kcal/step for a ~70kg adult) + resting metabolic floor.
 * Clearly an estimate — the route labels it `derived`.
 */
export function deriveCalories(steps: number): number {
  return Math.round(steps * 0.045 + 1450);
}

/**
 * Bucket timestamped samples into hourly means for the last `hours` hours.
 * Label "HH:00" in 24h local-of-day-of-sample. Sparse data yields sparse
 * series — the chart renders what exists, nothing is invented.
 */
export function buildHourlySeries(
  samples: { capturedAt: Date; value: number }[],
  hours = 14,
  now: Date = new Date(),
): HourlyPoint[] {
  const start = new Date(now.getTime() - hours * 3600_000);
  const buckets = new Map<string, number[]>();
  for (const s of samples) {
    if (s.capturedAt < start || s.capturedAt > now) continue;
    const key = `${s.capturedAt.getUTCHours()}:00`;
    const list = buckets.get(key);
    if (list) list.push(s.value);
    else buckets.set(key, [s.value]);
  }
  return [...buckets.entries()]
    .map(([t, values]) => ({ t, v: Math.round(mean(values) as number) }))
    .sort((a, b) => parseInt(a.t, 10) - parseInt(b.t, 10));
}

/**
 * Deterministic demo curve (no Date.now() jitter — stable across the
 * widget's 5s polling and SSR-safe). Only used when the DB has no
 * usable data; the payload is labelled source:"demo".
 */
export function demoSeries(points = 14): HourlyPoint[] {
  return Array.from({ length: points }, (_, i) => ({
    t: `${i * 2}:00`,
    v: 64 + Math.round(Math.sin(i / 1.7) * 9 + Math.cos(i / 2.3) * 5),
  }));
}

export const DEMO_PAYLOAD = {
  heart: 72,
  steps: 8420,
  sleep: 7.6,
  water: null as number | null,
  calories: 1840,
  mood: 86,
  spo2: 98,
  stress: 22,
  series: demoSeries(),
};
