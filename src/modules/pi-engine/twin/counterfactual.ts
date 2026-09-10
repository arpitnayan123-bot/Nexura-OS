/* ============================================================
 * PIE Phase 2.3 — The Counterfactual Engine ("What-If")
 * Simulates interventions ON the digital twin over a projected
 * timeline and reports predicted outcome deltas — enabling
 * shared decision-making with data-backed clarity.
 * Pure functions; deterministic and explainable.
 * ============================================================ */

import type { CounterfactualIntervention, CounterfactualOutcome, TwinStateVector } from "../types";
import { chronicDeteriorationRisk } from "./risk";
import { decayOneDay } from "./digital-twin";

/** Clinician-facing intervention catalog — extends via graph sync. */
export const INTERVENTION_CATALOG: CounterfactualIntervention[] = [
  {
    id: "metformin_up", label: "Increase Metformin dose", kind: "medication",
    effects: { hba1cDelta: -0.5, weightDeltaPct: -1, egfrProtect: 0.06 }, horizonDays: 90,
  },
  {
    id: "add_insulin", label: "Add basal Insulin", kind: "medication",
    effects: { hba1cDelta: -1.1, weightDeltaPct: +2, adherenceAdd: -0.02 }, horizonDays: 90,
  },
  {
    id: "sglt2", label: "Add SGLT2 inhibitor", kind: "medication",
    effects: { hba1cDelta: -0.7, weightDeltaPct: -2.5, egfrProtect: 0.18 }, horizonDays: 90,
  },
  {
    id: "ace_inhibitor", label: "Start ACE inhibitor", kind: "medication",
    effects: { sbpDelta: -8, egfrProtect: 0.14 }, horizonDays: 90,
  },
  {
    id: "beta_blocker", label: "Start Beta-blocker", kind: "medication",
    effects: { sbpDelta: -6, egfrProtect: 0.05 }, horizonDays: 90,
  },
  {
    id: "walk_30", label: "Walk 30 minutes daily", kind: "lifestyle",
    effects: { hba1cDelta: -0.4, sbpDelta: -4, weightDeltaPct: -2, adherenceAdd: 0.08 }, horizonDays: 90,
  },
  {
    id: "quit_smoking", label: "Quit smoking", kind: "lifestyle",
    effects: { sbpDelta: -3, egfrProtect: 0.12, adherenceAdd: 0.03 }, horizonDays: 90,
  },
  {
    id: "med_reminders", label: "Enable medication reminders", kind: "lifestyle",
    effects: { adherenceAdd: 0.14, hba1cDelta: -0.2 }, horizonDays: 90,
  },
];

const fmt = (x: number, digits = 1) => `${x > 0 ? "+" : ""}${x.toFixed(digits)}`;

/** Project the twin forward under an intervention; return outcome deltas. */
export function simulateIntervention(
  state: TwinStateVector,
  intervention: CounterfactualIntervention
): CounterfactualOutcome {
  const baselineAssess = chronicDeteriorationRisk(state);
  const baselineRisk = baselineAssess.score;

  // apply intervention effects onto a projected state
  const projected: TwinStateVector = { ...state };
  const e = intervention.effects;
  if (e.hba1cDelta && projected.hba1c !== null) projected.hba1c = Math.max(4, projected.hba1c + e.hba1cDelta);
  if (e.hba1cDelta && projected.hba1c === null) projected.hba1c = Math.max(4, 7.2 + e.hba1cDelta);
  if (e.sbpDelta && projected.sbp !== null) projected.sbp = Math.max(80, projected.sbp + e.sbpDelta);
  if (e.weightDeltaPct && projected.weightKg !== null) projected.weightKg = Number((projected.weightKg * (1 + e.weightDeltaPct / 100)).toFixed(2));
  if (e.adherenceAdd) projected.adherenceScore = Math.min(1, Math.max(0, projected.adherenceScore + e.adherenceAdd));

  // evolve over the horizon with decay dynamics, applying protection
  const days = intervention.horizonDays;
  for (let d = 0; d < days; d += 5) {
    const step = decayOneDay(projected, { adherence: projected.adherenceScore });
    if (projected.hba1c !== null && step.hba1c !== null) projected.hba1c = step.hba1c;
    if (projected.sbp !== null && step.sbp !== null) projected.sbp = step.sbp;
    if (projected.creatinine !== null && step.creatinine !== null) {
      projected.creatinine = step.creatinine * (1 - (e.egfrProtect ?? 0) * 0.5);
    }
  }

  const projectedAssess = chronicDeteriorationRisk(projected);
  const riskDelta = Number((projectedAssess.score - baselineRisk).toFixed(1));

  const lines: CounterfactualOutcome["outcomeLines"] = [];
  if (e.hba1cDelta) {
    lines.push({ label: "HbA1c", delta: `${fmt(e.hba1cDelta)}%`, direction: e.hba1cDelta < 0 ? "better" : "worse" });
  }
  if (e.sbpDelta) {
    lines.push({ label: "Systolic BP", delta: `${fmt(e.sbpDelta)} mmHg`, direction: e.sbpDelta < 0 ? "better" : "worse" });
  }
  if (e.weightDeltaPct) {
    lines.push({ label: "Body weight", delta: `${fmt(e.weightDeltaPct)}%`, direction: e.weightDeltaPct < 0 ? "better" : "worse" });
  }
  if (e.egfrProtect) {
    const pct = Math.round(e.egfrProtect * 100);
    lines.push({ label: "Kidney filtration risk", delta: `${riskDelta <= 0 ? "-" : "+"}${pct}% relative protection`, direction: "better" });
  }
  if (e.adherenceAdd) {
    lines.push({ label: "Adherence", delta: `${fmt(e.adherenceAdd * 100)}%`, direction: e.adherenceAdd > 0 ? "better" : "worse" });
  }
  lines.push({
    label: "Chronic decay score (90d)",
    delta: `${riskDelta > 0 ? "+" : ""}${riskDelta} points`,
    direction: riskDelta < -0.05 ? "better" : riskDelta > 0.05 ? "worse" : "neutral",
  });

  const caveats = [
    "Simulation on the digital twin — supports shared decision-making, not a substitute for clinical judgment.",
  ];
  if (e.hba1cDelta && state.creatinine !== null && state.creatinine > 1.4 && intervention.id === "metformin_up") {
    caveats.push("eGFR is reduced — metformin dose escalation needs renal-function monitoring.");
  }
  if (intervention.id === "add_insulin" && state.adherenceScore < 0.6) {
    caveats.push("Low adherence raises hypoglycemia risk with insulin — pair with reminders.");
  }

  return {
    intervention,
    baselineRisk,
    projectedRisk: projectedAssess.score,
    riskDelta,
    outcomeLines: lines,
    caveats,
  };
}

/** Run multiple what-ifs for comparison. */
export function simulateMany(state: TwinStateVector, ids: string[]): CounterfactualOutcome[] {
  return INTERVENTION_CATALOG.filter((i) => ids.includes(i.id)).map((i) => simulateIntervention(state, i));
}
