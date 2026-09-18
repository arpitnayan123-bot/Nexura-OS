/* ============================================================
 * PIE Phase 6.1 — Explainability Layer
 * Every prediction carries a "Why": SHAP-style additive
 * attribution so no clinician ever faces a black box.
 * ============================================================ */

import type { RiskAssessment, RiskDriver } from "../types";

export interface Explanation {
  headline: string;
  summary: string;
  topFactors: {
    rank: number;
    feature: string;
    contribution: number;
    direction: "up" | "down";
    detail: string;
  }[];
  protectiveFactors: { feature: string; detail: string }[];
  dataQuality: { completenessNote: string; confidence: number; uncertain: boolean };
}

/** Build a human "Why" payload from an assessment. */
export function explain(a: RiskAssessment, patientLabel: string): Explanation {
  const ups = a.drivers.filter((d) => d.direction === "up");
  const downs = a.drivers.filter((d) => d.direction === "down");
  const top = [...a.drivers]
    .sort((x, y) => Math.abs(y.contribution) - Math.abs(x.contribution))
    .slice(0, 3);
  const headline =
    a.band === "red"
      ? `Critical risk for ${patientLabel}`
      : a.band === "yellow"
        ? `Watchlist risk for ${patientLabel}`
        : `Stable outlook for ${patientLabel}`;
  const primary = top[0];
  const summary = primary
    ? `Risk is driven primarily by ${primary.feature.toLowerCase()} (${primary.detail}). ${ups.length} contributing factors, ${downs.length} protective factors in view.`
    : "Risk drivers are within expected ranges for this patient profile.";
  return {
    headline,
    summary,
    topFactors: top.map((d, i) => ({
      rank: i + 1,
      feature: d.feature,
      contribution: d.contribution,
      direction: d.direction,
      detail: d.detail,
    })),
    protectiveFactors: downs.map((d) => ({ feature: d.feature, detail: d.detail })),
    dataQuality: {
      completenessNote: a.uncertain
        ? "Uncertain — Manual Review Required (data completeness below threshold). No protocol was auto-generated."
        : "Data completeness sufficient for protocol automation.",
      confidence: a.confidence,
      uncertain: a.uncertain,
    },
  };
}

/**
 * SHAP-lite attribution decomposition: relative signed contributions
 * normalized to ±1 for visual bars.
 */
export function attributionBars(drivers: RiskDriver[]): { feature: string; normalized: number }[] {
  const maxAbs = Math.max(0.0001, ...drivers.map((d) => Math.abs(d.contribution)));
  return drivers.map((d) => ({
    feature: d.feature,
    normalized: Number((d.contribution / maxAbs).toFixed(3)),
  }));
}
