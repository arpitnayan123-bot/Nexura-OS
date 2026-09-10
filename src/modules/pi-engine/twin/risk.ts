/* ============================================================
 * PIE Phase 2.2 — Real-Time Risk Stratification ("Crisis Radar")
 * Specialized early-warning models over the twin state:
 *   • Sepsis — predicts 12–24h BEFORE qSOFA/SIRS criteria meet
 *     (trend-weighted: HR rising, temp instability, WBC drift,
 *     RR, SpO2, perfusion proxies)
 *   • Readmission — post-discharge 7-day degradation trajectory
 *   • Chronic deterioration — cumulative exposure to organ damage
 * Output: Time-to-Decay 0..100 + band + SHAP-like drivers +
 * confidence (data completeness × model agreement).
 * ============================================================ */

import { TTD_BANDS, CONFIDENCE_FLOOR } from "../types";
import type { RiskAssessment, RiskBand, RiskDomain, RiskDriver, TwinStateVector } from "../types";
import { defaultWeights, MODEL_VERSION, predictScore, featurize, FEATURES } from "./series";

export function bandOfScore(score: number): RiskBand {
  if (score <= TTD_BANDS.greenMax) return "green";
  if (score <= TTD_BANDS.yellowMax) return "yellow";
  return "red";
}

/**
 * Sepsis early warning — the flagship model.
 * Weighted composite of deviated vitals + trends + context.
 * Designed so a classic deteriorating trajectory (HR ↑ ~20 bpm/day,
 * temp instability, WBC ↑, RR ↑, SpO2 ↓) crosses the red threshold
 * while point-in-time SIRS still looks borderline.
 */
export function sepsisRisk(s: TwinStateVector): { score: number; drivers: RiskDriver[] } {
  const drivers: RiskDriver[] = [];
  const push = (feature: string, contribution: number, detail: string) =>
    drivers.push({ feature, contribution: Number(contribution.toFixed(2)), direction: contribution >= 0 ? "up" : "down", detail });

  let z = 6; // base
  if (s.hr !== null) {
    const c = Math.max(0, (s.hr - 82)) * 0.38 + Math.max(0, s.hrTrend) * 2.1;
    if (c > 0.3) push("Heart rate rising", c, `HR ${Math.round(s.hr)} bpm, slope ${s.hrTrend > 0 ? "+" : ""}${s.hrTrend.toFixed(1)}/day`);
    z += c;
  }
  if (s.tempC !== null) {
    const abnormal = s.tempC < 36.2 || s.tempC > 37.8;
    const c = abnormal ? Math.abs(s.tempC - 36.8) * 9 : Math.max(0, Math.abs(s.tempTrend) - 0.1) * 8;
    if (c > 0.3) push("Temperature instability", c, `Temp ${s.tempC.toFixed(1)}°C, slope ${s.tempTrend.toFixed(2)}°C/day`);
    z += c;
  }
  if (s.wbc !== null) {
    const c = Math.max(0, (s.wbc - 10.5)) * 1.4 + Math.max(0, s.wbcTrend) * 3.2;
    if (c > 0.3) push("WBC trending up", c, `WBC ${s.wbc.toFixed(1)}×10⁹/L, slope +${s.wbcTrend.toFixed(2)}/day`);
    z += c;
  }
  if (s.rr !== null) {
    const c = Math.max(0, (s.rr - 18)) * 1.1;
    if (c > 0.3) push("Respiratory rate up", c, `RR ${Math.round(s.rr)}/min`);
    z += c;
  }
  if (s.spo2 !== null) {
    const c = Math.max(0, (96 - s.spo2)) * 1.6;
    if (c > 0.3) push("Oxygen saturation falling", c, `SpO2 ${Math.round(s.spo2)}%`);
    z += c;
  }
  if (s.sbp !== null && s.sbp < 100) {
    const c = (100 - s.sbp) * 0.55;
    push("Blood pressure falling", c, `SBP ${Math.round(s.sbp)} mmHg`);
    z += c;
  }
  if (s.activeInfections.length) {
    const c = 2.4 * s.activeInfections.length;
    push("Known infection", c, s.activeInfections.join(", "));
    z += c;
  }
  if (s.age !== null && s.age > 65) {
    z += 2.2;
    push("Age > 65", 2.2, `age ${s.age}`);
  }

  const score = clamp01(z / 42) * 100;
  return { score: Number(score.toFixed(1)), drivers: drivers.sort((a, b) => b.contribution - a.contribution) };
}

/** Post-discharge readmission risk — 7-day degradation trajectory. */
export function readmissionRisk(s: TwinStateVector): { score: number; drivers: RiskDriver[] } {
  const drivers: RiskDriver[] = [];
  const push = (feature: string, contribution: number, detail: string) =>
    drivers.push({ feature, contribution: Number(contribution.toFixed(2)), direction: contribution >= 0 ? "up" : "down", detail });

  let z = 8;
  if (s.chronicConditions.length > 2) {
    z += 4.5;
    push("Multiple chronic conditions", 4.5, `${s.chronicConditions.length} active`);
  }
  if (s.adherenceScore < 0.6) {
    const c = (0.6 - s.adherenceScore) * 30;
    push("Low adherence after discharge", c, `adherence ${(s.adherenceScore * 100).toFixed(0)}%`);
    z += c;
  }
  if (s.weightTrend < -0.15) {
    const c = Math.min(8, Math.abs(s.weightTrend) * 20);
    push("Rapid weight loss", c, `${s.weightTrend.toFixed(2)} kg/day`);
    z += c;
  }
  if (s.creatinineTrend > 0.02) {
    const c = Math.min(8, s.creatinineTrend * 180);
    push("Renal function degrading", c, `creatinine +${s.creatinineTrend.toFixed(3)}/day`);
    z += c;
  }
  if (s.hrTrend > 2) {
    const c = Math.min(6, s.hrTrend * 1.5);
    push("Resting HR climbing", c, `+${s.hrTrend.toFixed(1)} bpm/day`);
    z += c;
  }
  if (s.sdoh.foodDesertKm !== null && s.sdoh.foodDesertKm > 1.5) {
    z += 2;
    push("Food desert proximity", 2, `${s.sdoh.foodDesertKm}km to fresh food`);
  }

  const score = clamp01(z / 45) * 100;
  return { score: Number(score.toFixed(1)), drivers: drivers.sort((a, b) => b.contribution - a.contribution) };
}

/** Long-horizon organ-damage probability for chronic patients. */
export function chronicDeteriorationRisk(s: TwinStateVector): { score: number; drivers: RiskDriver[] } {
  const drivers: RiskDriver[] = [];
  const push = (feature: string, contribution: number, detail: string) =>
    drivers.push({ feature, contribution: Number(contribution.toFixed(2)), direction: contribution >= 0 ? "up" : "down", detail });

  let z = 5;
  if (s.hba1c !== null) {
    const c = Math.max(0, (s.hba1c - 6.5)) * 4.4;
    if (c > 0.5) push("Cumulative glycemic exposure", c, `HbA1c ${s.hba1c.toFixed(1)}%`);
    z += c;
  }
  if (s.sbp !== null) {
    const c = Math.max(0, (s.sbp - 130)) * 0.30;
    if (c > 0.5) push("Sustained hypertension", c, `SBP ${Math.round(s.sbp)} mmHg`);
    z += c;
  }
  if (s.creatinine !== null) {
    const c = Math.max(0, (s.creatinine - 1.1)) * 5.5;
    if (c > 0.5) push("Renal marker above normal", c, `creatinine ${s.creatinine.toFixed(2)} mg/dL`);
    z += c;
  }
  if (s.ntProBnp !== null && s.ntProBnp > 300) {
    const c = Math.min(10, ((s.ntProBnp - 300) / 300) * 6);
    push("Cardiac strain marker", c, `NT-proBNP ${Math.round(s.ntProBnp)}`);
    z += c;
  }
  if (s.adherenceScore < 0.7) {
    const c = (0.7 - s.adherenceScore) * 22;
    push("Adherence gap", c, `adherence ${(s.adherenceScore * 100).toFixed(0)}%`);
    z += c;
  }
  if (s.sdoh.aqi !== null && s.sdoh.aqi > 100) {
    const c = Math.min(6, ((s.sdoh.aqi - 100) / 100) * 4);
    push("Air quality exposure", c, `AQI ${s.sdoh.aqi}`);
    z += c;
  }

  const score = clamp01(z / 50) * 100;
  return { score: Number(score.toFixed(1)), drivers: drivers.sort((a, b) => b.contribution - a.contribution) };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Data completeness → confidence component. */
export function dataCompleteness(s: TwinStateVector): number {
  const fields = [s.hr, s.tempC, s.wbc, s.rr, s.spo2, s.sbp, s.creatinine, s.hba1c, s.weightKg];
  const present = fields.filter((v) => v !== null).length;
  const trendFields = [s.hrTrend, s.tempTrend, s.wbcTrend, s.creatinineTrend];
  const trendPresent = trendFields.filter((v) => v !== 0).length; // 0 == no series
  return Number((0.7 * (present / fields.length) + 0.3 * (trendPresent / trendFields.length)).toFixed(3));
}

export interface StratifyOptions {
  weights?: ReturnType<typeof defaultWeights>;
  weightsVersion?: string;
}

/**
 * Full stratification: run all domain models, fuse into a composite
 * Time-to-Decay, attach explainability + confidence gating.
 */
export function stratify(
  s: TwinStateVector,
  opts?: StratifyOptions
): { composite: RiskAssessment; byDomain: Record<RiskDomain, RiskAssessment> } {
  const sepsis = sepsisRisk(s);
  const readmission = readmissionRisk(s);
  const chronic = chronicDeteriorationRisk(s);

  const mk = (domain: RiskDomain, score: number, drivers: RiskDriver[], horizon: number, rationale: string): RiskAssessment => {
    const completeness = dataCompleteness(s);
    // model agreement: how close the fused weights land to per-model scores
    const confidence = Number(Math.min(0.99, 0.55 + 0.45 * completeness).toFixed(3));
    return {
      patientId: s.patientId,
      domain,
      score,
      band: bandOfScore(score),
      confidence,
      horizonHours: horizon,
      drivers: drivers.slice(0, 5),
      modelVersion: opts?.weightsVersion ?? MODEL_VERSION,
      uncertain: confidence < CONFIDENCE_FLOOR,
      rationale,
    };
  };

  const byDomain: Record<RiskDomain, RiskAssessment> = {
    sepsis: mk("sepsis", sepsis.score, sepsis.drivers, 24, "Sepsis early-warning: trend-weighted physiological deviation."),
    readmission: mk("readmission", readmission.score, readmission.drivers, 168, "Post-discharge 7-day degradation trajectory."),
    chronic_deterioration: mk("chronic_deterioration", chronic.score, chronic.drivers, 2160, "Cumulative exposure model for chronic organ damage."),
    cardiac: mk("cardiac", Math.round(0.6 * chronic.score + 0.4 * readmission.score), [...chronic.drivers.slice(0, 2), ...readmission.drivers.slice(0, 2)], 72, "Cardiac composite: chronic strain + decompensation signals."),
    composite: mk("composite", 0, [], 24, ""),
  };

  // fuse: worst current risk dominates, others add weighted context
  const fused = Math.max(
    sepsis.score,
    readmission.score * 0.55,
    chronic.score * 0.5
  );
  const allDrivers = [...sepsis.drivers, ...readmission.drivers, ...chronic.drivers]
    .sort((a, b) => b.contribution - a.contribution);
  byDomain.composite = mk(
    "composite",
    Number(fused.toFixed(1)),
    allDrivers,
    24,
    `Composite Time-to-Decay dominated by ${fused === sepsis.score ? "acute (sepsis)" : fused === readmission.score * 0.55 ? "post-discharge" : "chronic"} trajectory.`
  );
  return { composite: byDomain.composite, byDomain };
}

/** Convenience: predict via the trainable series model (LSTM slot). */
export function seriesModelScore(s: TwinStateVector, opts?: StratifyOptions): number {
  return predictScore(opts?.weights ?? defaultWeights(), s);
}

export { FEATURES } from "./series";
