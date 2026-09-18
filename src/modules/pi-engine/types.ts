/* ============================================================
 * PIE — Predictive Intelligence Engine
 * "Healthcare is Reactive. Nexura Makes it Predictive."
 *
 * Core type system. Everything here is pure data — no IO — so the
 * whole engine is unit-testable without a database.
 * ============================================================ */

/** A single normalized observation in the Patient Life Stream. */
export interface LifeStreamPoint {
  source: "vitals" | "labs" | "medications" | "encounters" | "notes" | "bio" | "sdoh" | "behavior";
  kind: "observation" | "result" | "order" | "note_extract" | "signal" | "context" | "adherence";
  conceptCode?: string; // SNOMED-CT / ICD-10 / LOINC where mappable
  conceptSystem?: "SNOMED" | "ICD10" | "LOINC" | "LOCAL";
  title: string;
  value?: number;
  unit?: string;
  severity?: "info" | "watch" | "alert";
  outlier?: boolean;
  ts: string; // ISO timestamp
  data?: Record<string, unknown>;
}

export type BioMetric =
  | "heart_rate"
  | "hrv"
  | "spo2"
  | "resp_rate"
  | "temp"
  | "glucose"
  | "systolic"
  | "diastolic"
  | "sleep_stage"
  | "steps"
  | "weight";

export interface BioSample {
  metric: BioMetric;
  value: number;
  unit?: string;
  quality?: number; // 0..1
  capturedAt: string;
}

export interface BioSignalBatch {
  deviceId: string;
  patientId?: string;
  samples: BioSample[];
}

/** High-dimensional state vector — the Digital Twin's current physiology. */
export interface TwinStateVector {
  patientId: string;
  age: number | null;
  sex: "male" | "female" | "other";
  weightKg: number | null;
  /** Recent ( EWMA-smoothed ) vitals */
  hr: number | null; // resting heart rate bpm
  sbp: number | null; // systolic mmHg
  dbp: number | null; // diastolic mmHg
  rr: number | null; // respiratory rate /min
  tempC: number | null;
  spo2: number | null;
  /** Labs */
  wbc: number | null; // ×10⁹/L
  creatinine: number | null; // mg/dL
  hba1c: number | null; // %
  glucose: number | null; // fasting mg/dL
  potassium: number | null; // mEq/L
  ntProBnp: number | null; // pg/mL
  /** Trends (per-day slopes, EWMA-corrected) */
  hrTrend: number; // bpm/day
  tempTrend: number; // °C/day
  wbcTrend: number; // ×10⁹/L per day
  weightTrend: number; // kg/day
  creatinineTrend: number; // mg/dL/day
  /** Context */
  activeInfections: string[];
  medications: string[];
  chronicConditions: string[];
  geneticMarkers: string[];
  adherenceScore: number; // 0..1 EWMA
  sdoh: { aqi: number | null; foodDesertKm: number | null; crimeIndex: number | null };
  updatedAt: string;
}

/** Physics-based baseline (un corrected physiology). */
export interface TwinBaseline {
  /** Hemodynamics — Guyton-style first approximations */
  map: number | null; // mean arterial pressure = DBP + (SBP-DBP)/3
  cardiacOutput: number | null; // L/min ≈ 5.0 ± adaptation
  svr: number | null; // dyn·s·cm⁻⁵ ≈ 80 × (MAP − CVP) / CO, CVP≈5
  /** Metabolic */
  bmr: number | null; // kcal/day (Mifflin-St Jeor)
  bmi: number | null;
  egfr: number | null; // CKD-EPI 2021 (race-free), mL/min/1.73m²
  qtcRisk: number | null; // 0..1 composite from meds + K+
}

export interface SeriesModelWeights {
  bias: number;
  /** feature index → weight; features fixed order, see FEATURES */
  w: Record<string, number>;
  trainedSamples: number;
  loss: number;
  version: string;
}

export type RiskDomain =
  "sepsis" | "readmission" | "chronic_deterioration" | "cardiac" | "composite";
export type RiskBand = "green" | "yellow" | "red";

export interface RiskDriver {
  feature: string; // human-readable label
  contribution: number; // signed, SHAP-like
  direction: "up" | "down";
  detail: string;
}

export interface RiskAssessment {
  patientId: string;
  domain: RiskDomain;
  score: number; // Time-to-Decay 0..100
  band: RiskBand;
  confidence: number; // 0..1
  horizonHours: number;
  drivers: RiskDriver[];
  modelVersion: string;
  uncertain: boolean; // confidence < 0.8 → manual review, no auto-protocol
  rationale: string;
}

export interface CounterfactualIntervention {
  id: string;
  label: string;
  kind: "medication" | "lifestyle";
  /** canonical effect keys the twin understands */
  effects: Partial<{
    hba1cDelta: number; // % points over horizon
    sbpDelta: number; // mmHg
    weightDeltaPct: number; // % body weight
    activityAddMin: number; // min/week
    quitSmoking: boolean;
    adherenceAdd: number; // 0..1
    egfrProtect: number; // 0..1 reduced chronic-decay weight
  }>;
  horizonDays: number;
}

export interface CounterfactualOutcome {
  intervention: CounterfactualIntervention;
  baselineRisk: number;
  projectedRisk: number;
  riskDelta: number;
  outcomeLines: { label: string; delta: string; direction: "better" | "worse" | "neutral" }[];
  caveats: string[];
}

export interface ProtocolAction {
  action: string;
  window: string;
  role: "doctor" | "nurse" | "pharmacy" | "lab";
}

export interface PreEmptiveProtocolSpec {
  code: string;
  title: string;
  alert: string;
  primaryDriver: string;
  immediate: ProtocolAction[];
  monitoring: ProtocolAction[];
  dispo: string;
  evidence: string;
}

export interface FederatedDelta {
  tenantId: string;
  modelId: string;
  versionBase: string;
  versionNew: string;
  weights: Record<string, number>; // deltas only
  samples: number;
  loss?: number;
}

export interface FederatedGlobalModel {
  modelId: string;
  version: string;
  weights: Record<string, number>;
  contributingTenants: number;
  totalSamples: number;
  aggregatedAt: string;
}

export interface BiasAuditResult {
  slice: string;
  groupA: string;
  groupB: string;
  rateA: number;
  rateB: number;
  ratio: number; // four-fifths rule
  pass: boolean;
}

export const TTD_BANDS = { greenMax: 30, yellowMax: 70 } as const; // red = remainder
export const CONFIDENCE_FLOOR = 0.8; // below this: uncertain → manual review only
