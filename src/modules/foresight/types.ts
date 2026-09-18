/* ============================================================
 * NEXURA PREDICTIVE — HEALTH FORESIGHT ENGINE · contracts
 *
 * Deterministic, explainable risk-SIGNAL engine calibrated for
 * Indian users. It maps lifestyle, symptoms, anthropometrics,
 * vitals and labs onto condition-domain risk patterns.
 *
 * SAFETY POSTURE (non-negotiable):
 *  - Emergency/red-flag triage always runs FIRST and overrides
 *    every other layer.
 *  - Outputs are SIGNAL LEVELS within screening scope — never a
 *    diagnosis, never a disease probability percentage.
 *  - Every level is explainable: the contributing factors and
 *    their weights ship with the result.
 *  - Uncertainty is honest: confidence is a category
 *    (INSUFFICIENT_INFORMATION … HIGHER_WITHIN_SCREENING_SCOPE),
 *    never a fabricated number.
 *  - Engine, ruleset and calibration are versioned and stamped
 *    on every report.
 * ============================================================ */

export const ENGINE_VERSION = "foresight-2.0.0";
export const RULESET_VERSION = "nx-redflag-2.0.0";
export const CALIBRATION_VERSION = "india-cal-2.0.0";

/* ----------------------------- Inputs ----------------------------- */

export type SexAtBirth = "male" | "female" | "intersex" | "undisclosed";

export type DietType = "vegetarian" | "eggetarian" | "non_veg" | "vegan" | "jain";

export type CuisineRegion = "north" | "south" | "east" | "west" | "northeast" | "mixed";

export type Band =
  | "none" // zero / never
  | "rare" // <= 1 / week
  | "weekly" // 2-4 / week
  | "daily"; // 5+ / week

export type SaltBand = "low" | "moderate" | "high";
export type RiceRotiBalance = "rice_heavy" | "balanced" | "roti_heavy";

export type Occupation = "desk" | "field" | "household" | "student" | "other";
export type SleepQuality = "poor" | "fair" | "good";
export type Snoring = "none" | "occasional" | "loud_regular";
export type DaytimeSleepiness = "none" | "mild" | "severe";
export type Schedule = "regular" | "irregular";

export type GlucoseContext = "fasting" | "random" | "post_meal";
export type TobaccoUse = "never" | "former" | "current_smoke" | "smokeless";
export type AlcoholUse = "never" | "occasional" | "weekly" | "daily";
export type StressBand = "low" | "moderate" | "high";
export type AqiBand =
  | "unknown"
  | "good" // 0-50
  | "moderate" // 51-100
  | "poor" // 101-200
  | "very_poor" // 201-300
  | "severe"; // 300+

export type FamilyHistoryKey =
  "diabetes" | "heart_disease" | "hypertension" | "thyroid" | "cancer" | "pcos" | "obesity";

export interface ForesightProfile {
  ageYears: number; // 18-100, adults only
  sexAtBirth: SexAtBirth;
  heightCm?: number;
  weightKg?: number;
  waistCm?: number;
  pregnancyPossibility?: boolean;
}

export interface SymptomEntry {
  id: string; // canonical symptom id consumed by redflags + domains
  severity: number; // 1..10
  onsetDays: number; // days since first noticed
  worsening: boolean;
}

export interface ForesightDiet {
  type: DietType;
  cuisine: CuisineRegion;
  sweetsPerWeek: Band; // mithai / desserts
  friedPerWeek: Band; // pakora / puri / bhujia / deep-fried
  sugaryDrinksPerWeek: Band; // cold drinks / packaged juice
  riceRotiBalance: RiceRotiBalance;
  salt: SaltBand;
  breakfastSkipped: boolean;
  outsideFoodPerWeek: number; // restaurant / delivery meals
}

export interface ForesightActivity {
  minutesPerWeek: number; // brisk / intentional movement
  kinds: string[]; // walking, yoga, gym, running, cycling, sports, household
  occupation: Occupation;
  shiftWork: boolean;
}

export interface ForesightSleep {
  hoursPerNight: number; // 0..14
  quality: SleepQuality;
  snoring: Snoring;
  daytimeSleepiness: DaytimeSleepiness;
  schedule: Schedule;
  screensBeforeBed: boolean;
}

export interface ForesightVitals {
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  glucoseMgDl?: number;
  glucoseContext?: GlucoseContext;
  spo2?: number;
}

export interface ForesightLabs {
  hba1cPct?: number; // %
  hemoglobinGdl?: number; // g/dL
  tshMiuL?: number; // mIU/L
  vitaminDNgMl?: number; // ng/mL
  b12PgMl?: number; // pg/mL
  ldlMgDl?: number;
  hdlMgDl?: number;
  triglyceridesMgDl?: number;
}

export interface ForesightHistory {
  conditions: string[]; // known diagnoses, free labels
  familyHistory: FamilyHistoryKey[];
  tobacco: TobaccoUse; // includes smokeless (gutkha / paan / mishri)
  alcohol: AlcoholUse;
  stress: StressBand;
  moodLowDays: number; // days felt low/hopeless in the past 2 weeks (0-14)
  menstruationRegular?: boolean; // female-assigned only, optional
}

export interface ForesightEnvironment {
  aqiBand: AqiBand;
  sunlightMinutesPerDay?: number;
  city?: string; // never used as a disease label — context only
}

export interface ForesightInput {
  profile: ForesightProfile;
  symptoms: SymptomEntry[];
  diet: ForesightDiet;
  activity: ForesightActivity;
  sleep: ForesightSleep;
  vitals: ForesightVitals;
  labs: ForesightLabs;
  history: ForesightHistory;
  environment: ForesightEnvironment;
  freeText?: string; // "in your words" — scanned for red-flag language only
}

/* ----------------------------- Triage ----------------------------- */

export type TriageLevel = "EMERGENCY" | "SAME_DAY" | "STANDARD";

export interface RedFlagHit {
  id: string;
  level: TriageLevel;
  title: string;
  why: string; // plain-language explanation of the trigger
  action: string; // what to do right now
  source: "symptom" | "vitals" | "text" | "history" | "labs";
}

export interface TriageResult {
  level: TriageLevel;
  hits: RedFlagHit[];
  headline: string;
  body: string;
  /** Analysis is fully withheld for EMERGENCY, and de-emphasised for SAME_DAY. */
  analysisBlocked: boolean;
}

/* ----------------------------- Domains ---------------------------- */

export type DomainLevel = "LOW" | "WATCH" | "ELEVATED" | "HIGH";
export type Confidence =
  | "INSUFFICIENT_INFORMATION"
  | "LOW_CONFIDENCE"
  | "MODERATE_CONFIDENCE"
  | "HIGHER_WITHIN_SCREENING_SCOPE";

export type FactorDirection = "risk" | "protective";

export interface FactorHit {
  id: string;
  label: string; // human string (EN default; UI resolves i18n)
  weight: number; // positive number; direction gives sign
  direction: FactorDirection;
  detail?: string;
}

export interface ScreeningItem {
  test: string; // e.g. "HbA1c"
  why: string;
  cadence?: string; // e.g. "once now, then yearly"
}

export interface ActionItem {
  title: string;
  detail: string;
  effort: "easy" | "moderate" | "with-doctor";
}

export interface DomainResult {
  id: DomainId;
  level: DomainLevel;
  /** 0-100 burden inside screening scope (NOT a disease probability). */
  burden: number;
  confidence: Confidence;
  headline: string;
  factors: FactorHit[];
  screening: ScreeningItem[];
  actions: ActionItem[];
  clinicianQuestions: string[];
}

export type DomainId =
  | "metabolic"
  | "bp"
  | "heart"
  | "hemoglobin"
  | "vitamin_d"
  | "b12"
  | "thyroid"
  | "pcos"
  | "sleep"
  | "lungs"
  | "liver"
  | "mind";

export const ALL_DOMAIN_IDS: DomainId[] = [
  "metabolic",
  "bp",
  "heart",
  "hemoglobin",
  "vitamin_d",
  "b12",
  "thyroid",
  "pcos",
  "sleep",
  "lungs",
  "liver",
  "mind",
];

/* ----------------------------- Report ----------------------------- */

export type ScoreBand = "THRIVING" | "RESILIENT" | "BUILDING" | "ATTENTION";

export interface Trajectory {
  /** Illustrative direction over ~5 years if nothing changes (0-100 resilience). */
  unchangedScore: number;
  /** Illustrative direction if the top actions are followed. */
  withActionsScore: number;
  note: string;
}

export interface DietSwap {
  from: string;
  to: string;
  note?: string;
}

export interface DietPrescription {
  cuisineLabel: string;
  swaps: DietSwap[];
  plateRule: string[];
}

export interface ForesightReport {
  engineVersion: string;
  rulesetVersion: string;
  calibrationVersion: string;
  generatedAt: string;

  /** Structured clinician handoff text (rendered server-side by summarizeForDoctor). */
  doctorSummary?: string;

  triage: TriageResult;
  analysisWithheld: boolean;

  foresightScore: number; // 0-100 resilience (higher = better)
  scoreBand: ScoreBand;
  domains: DomainResult[];
  topDomainIds: DomainId[]; // up to 3 sorted by burden

  protectiveFactors: string[];
  trajectory: Trajectory;
  diet: DietPrescription;
  clinicianQuestions: string[]; // flattened, ordered by domain burden

  completeness: {
    answered: number;
    total: number;
    pct: number;
    missing: string[]; // critical fields not shared
  };

  disclaimer: string;
  emergencyLine: string;
  mentalHealthLine: string;
}
