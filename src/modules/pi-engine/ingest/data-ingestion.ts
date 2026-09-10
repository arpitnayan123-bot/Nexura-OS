/* ============================================================
 * PIE Phase 1.1 — DataIngestionService
 * Normalizes + timestamps multi-modal data into the unified
 * Patient Life Stream. Outliers are cleansed with robust
 * modified z-scores (MAD-based, immune to extreme values).
 * Pure functions — no IO. Persistence adapters live in db.ts.
 * ============================================================ */

import type { BioSample, LifeStreamPoint } from "../types";

/** Median of a numeric list. */
export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Modified z-score via Median Absolute Deviation.
 * |Mz| > threshold (default 3.5, Iglewicz & Hoaglin) ⇒ outlier.
 * Robust where plain z-scores fail (small n, heavy tails, mask effect).
 */
export function modifiedZScores(xs: number[]): number[] {
  const med = median(xs);
  const dev = xs.map((x) => Math.abs(x - med));
  const mad = median(dev) || 1e-9;
  return xs.map((x) => (0.6745 * (x - med)) / mad);
}

/** Split a series into (clean, outlierIndices). */
export function cleanseSeries(xs: number[], threshold = 3.5): { clean: number[]; outliers: number[] } {
  const mz = modifiedZScores(xs);
  const clean: number[] = [];
  const outliers: number[] = [];
  xs.forEach((x, i) => {
    if (Math.abs(mz[i]) > threshold) outliers.push(i);
    else clean.push(x);
  });
  return { clean, outliers };
}

/** Clinically plausible ranges — hard physical limits, not statistical. */
export const PLAUSIBLE: Record<string, [number, number]> = {
  heart_rate: [20, 260], hrv: [2, 400], spo2: [40, 100], resp_rate: [4, 80],
  temp: [30, 43], glucose: [15, 1500], systolic: [50, 300], diastolic: [20, 200],
  weight: [1, 400], steps: [0, 200000],
};

/** Drop physically impossible readings (sensor glitches). */
export function plausibilityFilter(samples: BioSample[]): BioSample[] {
  return samples.filter((s) => {
    const r = PLAUSIBLE[s.metric];
    return !r || (s.value >= r[0] && s.value <= r[1]);
  });
}

/** EWMA — exponentially weighted mean, the twin's short memory. */
export function ewma(xs: number[], alpha = 0.3): number {
  if (!xs.length) return NaN;
  return xs.reduce((acc, x) => (acc === null ? x : alpha * x + (1 - alpha) * acc), null as number | null) ?? xs[xs.length - 1];
}

/** Ordinary least squares slope over (dayOffset, value) — per-day trend. */
export function dailySlope(points: { ts: string; value: number }[]): number {
  if (points.length < 2) return 0;
  const t0 = new Date(points[0].ts).getTime();
  const xs = points.map((p) => (new Date(p.ts).getTime() - t0) / 86_400_000);
  const ys = points.map((p) => p.value);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0) || 1e-9;
  return num / den;
}

/**
 * Normalize a raw clinical row into a LifeStreamPoint.
 * Cleanses value against the patient's recent series when provided.
 */
export function toLifeStreamPoint(
  raw: Omit<LifeStreamPoint, "outlier"> & { value?: number },
  recentSeries?: number[]
): LifeStreamPoint {
  const point: LifeStreamPoint = { ...raw, outlier: false };
  if (typeof point.value === "number" && recentSeries && recentSeries.length >= 4) {
    const mz = modifiedZScores([...recentSeries, point.value]);
    if (Math.abs(mz[mz.length - 1]) > 3.5) {
      point.outlier = true;
      point.severity = point.severity ?? "watch";
      point.data = { ...point.data, cleansed: true, method: "modified_z_mad" };
    }
  }
  return point;
}

/** Merge + chronologically sort multiple sources into one stream. */
export function unifyStream(...streams: LifeStreamPoint[][]): LifeStreamPoint[] {
  return streams.flat().sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
}
