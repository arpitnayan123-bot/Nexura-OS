/* ============================================================
 * PIE Phase 6.2/6.3 — Fail-Safes, Drift, Bias Auditing, SaMD Registry
 * • Drift detection: rolling accuracy EMA vs registered baseline
 * • Bias auditing: four-fifths rule across demographic slices
 * • SaMD registry: model versions, training lineage, validation
 * Pure logic; persistence at the adapter layer.
 * ============================================================ */

import type { BiasAuditResult } from "../types";

/** EMA accuracy update; triggers drift alert when below baseline − ε. */
export function updateDrift(
  baseline: number,
  priorEma: number | null,
  observedAccuracy: number,
  alpha = 0.2,
  epsilon = 0.05,
): { ema: number; driftDetected: boolean; message?: string } {
  const ema =
    priorEma === null ? observedAccuracy : alpha * observedAccuracy + (1 - alpha) * priorEma;
  const driftDetected = ema < baseline - epsilon;
  return {
    ema: Number(ema.toFixed(4)),
    driftDetected,
    message: driftDetected
      ? `Model drift: rolling accuracy ${ema.toFixed(3)} fell below baseline ${baseline} — engineering alert raised.`
      : undefined,
  };
}

/**
 * Four-fifths (80%) disparate-impact audit on a demographic slice.
 * rates: positive-flag rates per group (e.g. red-band rate).
 */
export function biasAudit(slice: string, groupRates: Record<string, number>): BiasAuditResult[] {
  const groups = Object.entries(groupRates);
  const results: BiasAuditResult[] = [];
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const [ga, ra] = groups[i];
      const [gb, rb] = groups[j];
      const ratio = Math.min(ra, rb) / Math.max(Math.max(ra, rb), 1e-9);
      results.push({
        slice,
        groupA: ga,
        groupB: gb,
        rateA: Number(ra.toFixed(4)),
        rateB: Number(rb.toFixed(4)),
        ratio: Number(ratio.toFixed(3)),
        pass: ratio >= 0.8,
      });
    }
  }
  return results;
}

/** SaMD model registry entry — the audit-trail backbone. */
export interface SamdRegistryEntry {
  modelId: string;
  version: string;
  samdClass: "Class II SaMD";
  stage: "experimental" | "validated" | "production" | "retired";
  trainingWindow: string;
  validation: { sensitivity?: number; specificity?: number; auroc?: number; n?: number };
  driftBaseline: number;
  intendedUse: string;
  limitations: string[];
}

export const SAMD_REGISTRY: SamdRegistryEntry[] = [
  {
    modelId: "sepsis_early_warning",
    version: "1.2.0",
    samdClass: "Class II SaMD",
    stage: "production",
    trainingWindow:
      "retrospective cohort n=18,420 encounters, 2024-01..2026-06, 3 tertiary sites (synthetic replay for demo)",
    validation: { sensitivity: 0.86, specificity: 0.79, auroc: 0.88, n: 18420 },
    driftBaseline: 0.85,
    intendedUse:
      "24h sepsis deterioration early warning for hospitalized adults; supports — does not replace — clinical judgment.",
    limitations: [
      "Trained on inpatient trajectories; outpatient transferability under validation",
      "Neutropenic presentations under-represented in training data",
      "Not validated during pregnancy",
    ],
  },
  {
    modelId: "readmission_trajectory",
    version: "1.1.0",
    samdClass: "Class II SaMD",
    stage: "production",
    trainingWindow:
      "retrospective cohort n=9,150 discharges, 2024-06..2026-05 (synthetic replay for demo)",
    validation: { sensitivity: 0.74, specificity: 0.72, auroc: 0.79, n: 9150 },
    driftBaseline: 0.75,
    intendedUse: "7-day post-discharge degradation flagging for care coordination.",
    limitations: ["Depends on post-discharge device adoption; coverage bias possible"],
  },
  {
    modelId: "chronic_organ_decay",
    version: "1.0.3",
    samdClass: "Class II SaMD",
    stage: "validated",
    trainingWindow: "longitudinal cohort n=5,600 patients × 24 months (synthetic replay for demo)",
    validation: { auroc: 0.81, n: 5600 },
    driftBaseline: 0.78,
    intendedUse: "12–36 month cumulative-exposure risk for T2DM/HTN/CKD organ damage.",
    limitations: [
      "Linear-exposure assumption; acute events modeled separately",
      "SDoH inputs limited to bundled regional dataset in demo",
    ],
  },
];

/** Confidence fail-safe: enforce the 0.8 gate at engine level too. */
export function enforceConfidenceGate(
  confidence: number,
  floor = 0.8,
): { allowed: boolean; flag?: string } {
  if (confidence < floor) {
    return { allowed: false, flag: "Uncertain — Manual Review Required" };
  }
  return { allowed: true };
}
