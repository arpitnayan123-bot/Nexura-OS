/* ============================================================
 * PIE Phase 1.3 — BioSignalIngestionEngine
 * Receives wearable JSON streams (HR, HRV, SpO2, sleep, glucose),
 * applies plausibility + robust outlier cleansing, computes
 * per-window features and night summaries for the twin.
 * Pure functions; persistence adapters in db.ts.
 * ============================================================ */

import type { BioSample, BioSignalBatch } from "../types";
import { cleanseSeries, ewma, plausibilityFilter } from "./data-ingestion";

export interface BioIngestReport {
  received: number;
  accepted: number;
  rejectedImplausible: number;
  rejectedOutlier: number;
  perMetric: Record<string, { count: number; ewma: number | null }>;
}

const METRIC_RANGES: Record<string, [number, number]> = {
  heart_rate: [20, 260], hrv: [2, 400], spo2: [40, 100], resp_rate: [4, 80],
  temp: [30, 43], glucose: [15, 1500], systolic: [50, 300], diastolic: [20, 200],
  weight: [1, 400], steps: [0, 200000],
};

/** Validate + clean one device batch. Returns accepted samples + report. */
export function ingestBioBatch(batch: BioSignalBatch): { accepted: BioSample[]; report: BioIngestReport } {
  const byMetric = new Map<string, BioSample[]>();
  let rejectedImplausible = 0;

  const plausible = batch.samples.filter((s) => {
    const r = METRIC_RANGES[s.metric];
    const okRange = !r || (s.value >= r[0] && s.value <= r[1]);
    if (!okRange) rejectedImplausible += 1;
    return okRange;
  });

  let rejectedOutlier = 0;
  // group by metric, cleanse each series independently (robust z)
  for (const s of plausible) {
    const arr = byMetric.get(s.metric) ?? [];
    arr.push(s);
    byMetric.set(s.metric, arr);
  }

  const accepted: BioSample[] = [];
  const perMetric: BioIngestReport["perMetric"] = {};
  for (const [metric, arr] of byMetric) {
    const { clean, outliers } = cleanseSeries(arr.map((s) => s.value));
    rejectedOutlier += outliers.length;
    const kept = arr.filter((s, i) => !outliers.includes(i));
    accepted.push(...kept);
    perMetric[metric] = { count: kept.length, ewma: kept.length ? Number(ewma(kept.map((s) => s.value)).toFixed(2)) : null };
  }

  return {
    accepted,
    report: {
      received: batch.samples.length,
      accepted: accepted.length,
      rejectedImplausible,
      rejectedOutlier,
      perMetric,
    },
  };
}

/** Night summary from sleep-stage samples (stage: 1=deep 2=light 3=rem 0=awake). */
export function nightSummary(samples: BioSample[]): {
  deepPct: number | null; remPct: number | null; awakenings: number | null; totalMinutes: number;
} {
  const sleep = samples.filter((s) => s.metric === "sleep_stage");
  if (!sleep.length) return { deepPct: null, remPct: null, awakenings: null, totalMinutes: 0 };
  const total = sleep.length;
  const deep = sleep.filter((s) => s.value === 1).length;
  const rem = sleep.filter((s) => s.value === 3).length;
  let awakenings = 0;
  for (let i = 1; i < sleep.length; i++) {
    if (sleep[i].value === 0 && sleep[i - 1].value !== 0) awakenings += 1;
  }
  return {
    deepPct: Number(((deep / total) * 100).toFixed(1)),
    remPct: Number(((rem / total) * 100).toFixed(1)),
    awakenings,
    totalMinutes: total * 5, // 5-min epochs assumed
  };
}

/** Rolling variability features the sepsis model feeds on. */
export function variabilityFeatures(values: number[]): { stddev: number; cv: number; lastEwma: number } {
  if (values.length < 2) return { stddev: 0, cv: 0, lastEwma: values[0] ?? 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);
  return {
    stddev: Number(stddev.toFixed(3)),
    cv: Number((stddev / (mean || 1e-9)).toFixed(4)),
    lastEwma: Number(ewma(values).toFixed(3)),
  };
}
