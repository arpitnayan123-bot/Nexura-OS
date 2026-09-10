/* ============================================================
 * PIE Phase 2.1 — The Digital Twin
 * Hybrid modeling: physics-based physiological baselines
 * (Guyton-style hemodynamics, Mifflin-St Jeor metabolism,
 * CKD-EPI 2021 renal function) overlaid with the data-driven
 * series correction (twin/series.ts). Pure functions.
 * ============================================================ */

import type { TwinBaseline, TwinStateVector } from "../types";

/** Mean arterial pressure: MAP = DBP + (SBP − DBP) / 3 */
export function meanArterialPressure(sbp: number | null, dbp: number | null): number | null {
  if (sbp === null || dbp === null) return null;
  return Number((dbp + (sbp - dbp) / 3).toFixed(1));
}

/**
 * Cardiac output estimate with obesity/anemia adaptations.
 * CO ≈ BSA-indexed 3.0–5.6 L/min; we model index 3.1 + BMI & HR adjustments.
 */
export function cardiacOutput(hr: number | null, weightKg: number | null, heightCm = 165): number | null {
  if (hr === null || weightKg === null) return null;
  const bmi = weightKg / ((heightCm / 100) ** 2);
  const ci = 3.1 + Math.max(0, bmi - 25) * 0.02 + (hr - 70) * 0.015;
  const bsa = Math.sqrt((heightCm * weightKg) / 3600);
  return Number(Math.max(2.5, Math.min(9, ci * bsa)).toFixed(2));
}

/** SVR = 80 × (MAP − CVP) / CO, CVP ≈ 5 mmHg. */
export function systemicVascularResistance(map: number | null, co: number | null): number | null {
  if (map === null || co === null || co <= 0) return null;
  return Number(Math.max(400, Math.min(2500, (80 * (map - 5)) / co)).toFixed(0));
}

/** Mifflin-St Jeor BMR. */
export function basalMetabolicRate(sex: "male" | "female" | "other", weightKg: number | null, heightCm = 165, age: number | null = 40): number | null {
  if (weightKg === null) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * (age ?? 40);
  return Math.round(sex === "male" ? base + 5 : sex === "female" ? base - 161 : base - 78);
}

/** CKD-EPI 2021 (race-free) eGFR, mL/min/1.73m². creat mg/dL. */
export function egfr2021(age: number | null, sex: "male" | "female" | "other", creat: number | null): number | null {
  if (creat === null || creat <= 0) return null;
  const a = age ?? 50;
  const kappa = sex === "female" ? 0.7 : 0.9;
  const alpha = sex === "female" ? -0.241 : -0.302;
  const creatNorm = creat / kappa;
  const minTerm = Math.min(creatNorm, 1) ** alpha;
  const maxTerm = Math.max(creatNorm, 1) ** -1.2;
  const sexFactor = sex === "female" ? 1.012 : 1;
  const v = 142 * minTerm * maxTerm * 0.9938 ** a * sexFactor;
  return Number(Math.max(3, Math.min(140, v)).toFixed(1));
}

/** QT-prolongation composite risk: QT meds + hypokalemia + bradycardia. */
const QT_MEDS = ["amiodarone", "azithromycin", "ciprofloxacin", "ondansetron", "haloperidol", "quetiapine", "sotalol"];
export function qtRisk(medications: string[], potassium: number | null, hr: number | null): number | null {
  const qtMeds = medications.filter((m) => QT_MEDS.some((q) => m.toLowerCase().includes(q))).length;
  if (!qtMeds && potassium === null) return null;
  let r = 0.05 * qtMeds;
  if (potassium !== null && potassium < 3.5) r += (3.5 - potassium) * 0.18;
  if (hr !== null && hr < 55) r += 0.08;
  return Number(Math.min(1, Math.max(0, r)).toFixed(2));
}

/** Assemble the physics baseline from the current state vector. */
export function computeBaseline(state: TwinStateVector, heightCm = 165): TwinBaseline {
  const map = meanArterialPressure(state.sbp, state.dbp);
  const co = cardiacOutput(state.hr, state.weightKg, heightCm);
  const bmi = state.weightKg !== null ? Number((state.weightKg / ((heightCm / 100) ** 2)).toFixed(1)) : null;
  return {
    map,
    cardiacOutput: co,
    svr: systemicVascularResistance(map, co),
    bmr: basalMetabolicRate(state.sex, state.weightKg, heightCm, state.age),
    bmi,
    egfr: egfr2021(state.age, state.sex, state.creatinine),
    qtcRisk: qtRisk(state.medications, state.potassium, state.hr),
  };
}

/** Age the twin one day forward under no-intervention dynamics. */
export function decayOneDay(
  state: TwinStateVector,
  opts?: { cardiopulmonaryMult?: number; metabolicMult?: number; adherence?: number }
): TwinStateVector {
  const adher = opts?.adherence ?? state.adherenceScore;
  // chronic drift: uncontrolled T2DM/HTN slowly worsen; adherence buffers
  const drift = (1 - adher) * 0.5 + 0.03; // 0.03..0.53 per day in composite units
  const next: TwinStateVector = { ...state, updatedAt: new Date().toISOString() };
  if (state.hba1c !== null) next.hba1c = Number((state.hba1c + drift * 0.01 * (opts?.metabolicMult ?? 1)).toFixed(3));
  if (state.sbp !== null) next.sbp = Number((state.sbp + drift * 0.12 * (opts?.metabolicMult ?? 1)).toFixed(2));
  if (state.creatinine !== null) next.creatinine = Number((state.creatinine + drift * 0.002 * (opts?.metabolicMult ?? 1)).toFixed(4));
  if (state.weightKg !== null) next.weightKg = Number((state.weightKg - 0.01).toFixed(3));
  return next;
}
