/* ============================================================
 * PIE Phase 4 — Federated Learning Framework
 * Privacy-by-design model improvement: tenants train locally,
 * send ONLY weight deltas (never data), the Nexus aggregates via
 * sample-weighted FedAvg and pushes the improved global model.
 * A rare pattern seen in a rural clinic improves detection in
 * Mumbai without any patient data leaving the village.
 * Pure math; persistence adapters at the API layer.
 * ============================================================ */

import type { FederatedDelta, FederatedGlobalModel, SeriesModelWeights } from "../types";

/**
 * FedAvg: sample-weighted average of client deltas.
 * versionNew aggregation is lexicographic-max of the bases bumped.
 */
export function federatedAverage(
  modelId: string,
  deltas: FederatedDelta[],
  globalVersion: string,
): FederatedGlobalModel | null {
  const valid = deltas.filter((d) => d.samples > 0 && Object.keys(d.weights).length > 0);
  if (!valid.length) return null;

  const totalSamples = valid.reduce((a, d) => a + d.samples, 0);
  const keys = new Set<string>();
  valid.forEach((d) => Object.keys(d.weights).forEach((k) => keys.add(k)));

  const weights: Record<string, number> = {};
  for (const k of keys) {
    let acc = 0;
    for (const d of valid) acc += (d.weights[k] ?? 0) * (d.samples / totalSamples);
    weights[k] = Number(acc.toFixed(6));
  }

  return {
    modelId,
    version: nextVersion(globalVersion),
    weights,
    contributingTenants: valid.length,
    totalSamples,
    aggregatedAt: new Date().toISOString(),
  };

  function nextVersion(v: string): string {
    const parts = v.split(".").map((x) => parseInt(x, 10) || 0);
    parts[2] = (parts[2] ?? 0) + 1;
    return parts.join(".");
  }
}

/**
 * Privacy minimization guard — reject deltas that look like raw data.
 * Deltas must be small-magnitude weight updates; raw payloads or
 * oversized deltas are a leak vector (model inversion).
 */
export function validateDeltaPrivacy(
  d: FederatedDelta,
  maxAbsWeight = 5,
  maxKeys = 64,
): { ok: boolean; reason?: string } {
  if (d.samples <= 0) return { ok: false, reason: "samples must be positive" };
  if (Object.keys(d.weights).length > maxKeys)
    return { ok: false, reason: "delta carries too many keys — possible data payload" };
  for (const [k, v] of Object.entries(d.weights)) {
    if (!Number.isFinite(v)) return { ok: false, reason: `non-finite value in ${k}` };
    if (Math.abs(v) > maxAbsWeight)
      return { ok: false, reason: `|${k}|=${v} exceeds weight-delta bounds — possible raw data` };
  }
  return { ok: true };
}

/** Apply an aggregated global delta onto local weights (bounded step). */
export function applyGlobalUpdate(
  local: SeriesModelWeights,
  global: FederatedGlobalModel,
  lr = 0.5,
): SeriesModelWeights {
  const w = { ...local.w };
  for (const [k, v] of Object.entries(global.weights)) {
    if (k in w) w[k] = Number((w[k] + lr * v).toFixed(5));
  }
  return { ...local, w, version: global.version };
}

/**
 * Differential-privacy-lite: clip + small noise on deltas a tenant
 * uploads, bounding any single patient's influence.
 */
export function sanitizeOutgoingDelta(
  weights: Record<string, number>,
  clip = 1.0,
  noiseScale = 0.01,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(weights)) {
    const clipped = Math.max(-clip, Math.min(clip, v));
    const noise = (Math.random() * 2 - 1) * noiseScale * clip;
    out[k] = Number((clipped + noise).toFixed(6));
  }
  return out;
}
