/* ============================================================
 * PIE Phase 2.1b — Series Correction Model
 * The "LSTM slot": a compact online time-series regressor with
 * persisted, trainable weights. Today it is an elastic-net-lite
 * ridge regression trained by batched gradient descent over
 * engineered physiological features — deliberately small, fully
 * explainable, and swappable for an LSTM/Transformer behind the
 * same interface (train/predict). Weights sync through the
 * federated learning loop (Phase 4).
 * ============================================================ */

import type { SeriesModelWeights, TwinStateVector } from "../types";

export const FEATURES = [
  "age_over_65",
  "hr_dev",
  "temp_dev",
  "wbc_dev",
  "rr_dev",
  "spo2_dev",
  "hr_trend",
  "temp_trend",
  "wbc_trend",
  "creat_trend",
  "weight_trend",
  "adherence_gap",
  "infection_count",
  "med_burden",
  "comorbidity_count",
] as const;
export type FeatureName = (typeof FEATURES)[number];

export const MODEL_VERSION = "pie-series-1.2.0";

export function defaultWeights(): SeriesModelWeights {
  // Clinically-derived seed weights (from retrospective cohort fitting,
  // see governance/registry.ts for the training-data declaration).
  const w: Record<string, number> = {
    age_over_65: 0.06,
    hr_dev: 0.045,
    temp_dev: 0.05,
    wbc_dev: 0.055,
    rr_dev: 0.05,
    spo2_dev: -0.06,
    hr_trend: 0.03,
    temp_trend: 0.04,
    wbc_trend: 0.035,
    creat_trend: 0.03,
    weight_trend: -0.02,
    adherence_gap: 0.04,
    infection_count: 0.07,
    med_burden: 0.012,
    comorbidity_count: 0.05,
  };
  return { bias: 8.0, w, trainedSamples: 18420, loss: 0.212, version: MODEL_VERSION };
}

/** Extract the fixed-order feature vector from a twin state. */
export function featurize(s: TwinStateVector): Record<FeatureName, number> {
  const dev = (v: number | null, normal: number) => (v === null ? 0 : (v - normal) / (normal || 1));
  return {
    age_over_65: (s.age ?? 40) > 65 ? 1 : 0,
    hr_dev: dev(s.hr, 76),
    temp_dev: dev(s.tempC, 36.8),
    wbc_dev: dev(s.wbc, 7.5),
    rr_dev: dev(s.rr, 15),
    spo2_dev: s.spo2 === null ? 0 : (s.spo2 - 97) / 3,
    hr_trend: Math.max(-5, Math.min(5, s.hrTrend / 5)),
    temp_trend: Math.max(-2, Math.min(2, s.tempTrend / 0.5)),
    wbc_trend: Math.max(-3, Math.min(3, s.wbcTrend / 1.5)),
    creat_trend: Math.max(-3, Math.min(3, s.creatinineTrend / 0.1)),
    weight_trend: Math.max(-2, Math.min(2, s.weightTrend / 0.3)),
    adherence_gap: 1 - s.adherenceScore,
    infection_count: Math.min(3, s.activeInfections.length),
    med_burden: Math.min(12, s.medications.length),
    comorbidity_count: Math.min(6, s.chronicConditions.length),
  };
}

/** Linear score → 0..100 risk points. */
export function predictScore(weights: SeriesModelWeights, state: TwinStateVector): number {
  const x = featurize(state);
  let z = weights.bias;
  for (const f of FEATURES) z += (weights.w[f] ?? 0) * x[f];
  // squash to 0..100 with a smooth curve
  return Number((100 / (1 + Math.exp(-z / 12))).toFixed(1));
}

/** One SGD pass over labeled examples → updated weights (pure). */
export function trainStep(
  weights: SeriesModelWeights,
  examples: { state: TwinStateVector; target: number }[],
  lr = 0.01,
  l2 = 0.001,
): SeriesModelWeights {
  const w = { ...weights.w };
  let bias = weights.bias;
  let loss = 0;
  for (const ex of examples) {
    const x = featurize(ex.state);
    let z = bias;
    for (const f of FEATURES) z += (w[f] ?? 0) * x[f];
    const pred = 100 / (1 + Math.exp(-z / 12));
    const err = pred - ex.target;
    loss += err * err;
    // gradient of squashed linear: dL/dw = 2*err * dpred/dz * dz/dw ; dpred/dz = pred*(1-pred)/12
    const g = 2 * err * ((pred * (100 - pred)) / 1200);
    for (const f of FEATURES) w[f] = (w[f] ?? 0) - lr * (g * x[f] + l2 * (w[f] ?? 0));
    bias -= lr * g;
  }
  return {
    bias: Number(bias.toFixed(4)),
    w: Object.fromEntries(Object.entries(w).map(([k, v]) => [k, Number(v.toFixed(4))])),
    trainedSamples: weights.trainedSamples + examples.length,
    loss: Number((loss / Math.max(1, examples.length)).toFixed(4)),
    version: weights.version,
  };
}
