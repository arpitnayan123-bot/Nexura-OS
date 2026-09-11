/* ============================================================
 * NEXURA PREDICTIVE HEALTH INTELLIGENCE (PHI) — CONTRACTS
 * Single source of truth for types, versions, and engine
 * interfaces. Every module under src/modules/phi and every
 * /api/nx/phi route MUST code against these contracts.
 *
 * SAFETY POSTURE (non-negotiable):
 *  - Deterministic triage ALWAYS runs before any generative layer.
 *  - No disease probabilities in v0.1 (DEMO_ONLY posture).
 *  - Confidence CATEGORIES, never percentages.
 *  - The LLMFormatter can only rephrase engine output; it can
 *    never alter urgency, invent findings, or override triage.
 *  - Every assessment stamps engine / ruleset / content versions.
 * ============================================================ */

/* ---------------- Version stamps ---------------- */

export const PHI_ENGINE_VERSION = "0.1.0";
export const PHI_RULESET_ID = "nexura-redflag";
export const PHI_RULESET_VERSION = "1.0.0";
export const PHI_CONTENT_VERSION = "demo-1";
export const PHI_DISCLAIMER =
  "Nexura Predictive Health Intelligence helps users identify health-risk signals and preventive opportunities. It does not diagnose disease or replace professional medical care.";

/* ---------------- Urgency (ordered, highest first) ---------------- */

export const URGENCY_LEVELS = [
  "EMERGENCY_NOW",
  "SAME_DAY_MEDICAL_REVIEW",
  "PROMPT_APPOINTMENT",
  "ROUTINE_FOLLOW_UP",
  "MONITOR_AND_PREVENT",
] as const;

export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

/** Higher number = more urgent. Used to merge rule outcomes safely. */
export const URGENCY_RANK: Record<UrgencyLevel, number> = {
  EMERGENCY_NOW: 5,
  SAME_DAY_MEDICAL_REVIEW: 4,
  PROMPT_APPOINTMENT: 3,
  ROUTINE_FOLLOW_UP: 2,
  MONITOR_AND_PREVENT: 1,
};

export function maxUrgency(a: UrgencyLevel, b: UrgencyLevel): UrgencyLevel {
  return URGENCY_RANK[a] >= URGENCY_RANK[b] ? a : b;
}

/* ---------------- Confidence categories (never numeric) ---------------- */

export const CONFIDENCE_CATEGORIES = [
  "INSUFFICIENT_INFORMATION",
  "LOW_CONFIDENCE",
  "MODERATE_CONFIDENCE",
  "HIGHER_CONFIDENCE_WITHIN_SCREENING_SCOPE",
] as const;

export type ConfidenceCategory = (typeof CONFIDENCE_CATEGORIES)[number];

/* ---------------- Safety alerts ---------------- */

export type SafetyAlert = {
  ruleId: string;
  title: string;
  /** Direct, calm, unambiguous — shown BEFORE anything else. */
  userAction: string;
  whyRemoteAssessmentUnsafe: string;
  careNavigation: string;
};

/* ---------------- Assessment output types ---------------- */

export type RiskSignal = {
  id: string;
  label: string;
  category:
    | "cardiometabolic"
    | "sleep"
    | "nutrition"
    | "activity"
    | "mental_wellbeing"
    | "respiratory"
    | "substance"
    | "vitals"
    | "labs"
    | "general";
  severity: "informational" | "watch" | "elevated";
  confidence: ConfidenceCategory;
  /** Which user inputs produced this signal (field names, not raw PHI). */
  contributingInputs: string[];
  /** Plain language: why Nexura noticed this. */
  observation: string;
  whatIsUnknown: string;
  whatCouldClarify: string;
  recommendedNextStep: string;
  notADiagnosis: true;
};

export type PossibleHealthPattern = {
  id: string;
  label: string;
  plainExplanation: string;
  whyItAppeared: string;
  supportingInputs: string[];
  contradictingInputs: string[];
  missingInformation: string;
  whatClinicianMayEvaluate: string;
  confidence: ConfidenceCategory;
  notADiagnosis: true;
};

export type RecommendedNextStep = {
  id: string;
  title: string;
  detail: string;
  /** Content key into the evidence repository; unresolved keys render a safe placeholder. */
  contentKey?: string;
  effort: "low" | "moderate" | "planned_with_clinician";
  category: "monitor" | "lifestyle" | "clinical_review" | "safety" | "data_completeness";
};

export type TrendDirection = "improving" | "deteriorating" | "stable" | "insufficient_data";

export type TrendObservation = {
  metric:
    | "sleep_hours"
    | "activity_minutes"
    | "weight_kg"
    | "systolic"
    | "diastolic"
    | "resting_hr"
    | "glucose"
    | "spo2"
    | "stress"
    | "symptom_repeats";
  label: string;
  direction: TrendDirection;
  /** Human summary — careful, non-disease language. */
  summary: string;
  dataPoints: number;
  lastValue?: number;
  unit?: string;
};

export type ClinicianQuestion = {
  id: string;
  question: string;
  reason: string;
};

export type PredictiveHealthAssessment = {
  id: string;
  subjectId: string;
  createdAt: string;
  inputDataRange: { from: string | null; to: string | null };
  engineVersion: string;
  rulesetId: string;
  rulesetVersion: string;
  contentVersion: string;
  dataCompleteness: number; // 0..100
  qualityWarnings: string[];
  /** Pipeline position 4 — ALWAYS evaluated and rendered first. */
  urgency: UrgencyLevel;
  safetyAlerts: SafetyAlert[];
  /** True when triage short-circuited the rest of the pipeline. */
  triageOnly: boolean;
  riskSignals: RiskSignal[];
  possiblePatterns: PossibleHealthPattern[];
  contributingFactors: string[];
  protectiveFactors: string[];
  missingInformation: string[];
  recommendedNextSteps: RecommendedNextStep[];
  clinicianQuestions: ClinicianQuestion[];
  trends: TrendObservation[];
  followUpIntervalDays: number | null;
  disclaimer: string;
  /** Special-population routing notice (e.g. minors, pregnancy). */
  routingNotice: string | null;
  audit: { assessmentsRun: number };
};

/* ---------------- Engine interfaces (replaceable providers) ---------------- */

export type TriageInput = {
  ageYears: number | null;
  sexAtBirth: "male" | "female" | "intersex" | "undisclosed" | null;
  pregnancyPossibility: boolean;
  symptoms: TriagedSymptom[];
  vitals: TriagedVitals | null;
  conditions: string[];
  medications: string[];
  selfHarmLanguage: boolean;
  overdoseOrPoisoningSignal: boolean;
  traumaSignal: boolean;
};

export type TriagedSymptom = {
  category: string;
  severity1to10: number;
  suddenOnset: boolean;
  worsening: boolean;
  durationDays: number | null;
  associated: string[];
};

export type TriagedVitals = {
  systolic?: number | null;
  diastolic?: number | null;
  heartRate?: number | null;
  temperatureC?: number | null;
  spo2?: number | null;
  glucoseMgDl?: number | null;
  weightKg?: number | null;
  atRest: boolean;
  /** User-entered confidence ("sure" | "unsure") — used by data quality only. */
  confidence?: string | null;
};

export type TriageOutcome = {
  urgency: UrgencyLevel;
  alerts: SafetyAlert[];
  /** Rule ids that fired, for audit. */
  matchedRuleIds: string[];
  /** True when uncertain-but-serious => escalated (never reassured). */
  escalatedOnUncertainty: boolean;
  specialRouting: string | null;
};

export interface TriageRulesEngine {
  readonly id: string;
  readonly version: string;
  evaluate(input: TriageInput): TriageOutcome;
}

export type QualityWarning = {
  field: string;
  issue: "missing" | "implausible" | "contradictory" | "stale" | "low_confidence" | "unit_unverified";
  message: string;
};

export interface DataQualityEngine {
  readonly version: string;
  assess(
    profile: ProfileSnapshot,
    records: RecordSnapshot
  ): {
    completeness: number;
    warnings: QualityWarning[];
    missingInformation: string[];
  };
}

export interface RiskModelProvider {
  readonly id: string;
  readonly version: string;
  /** v0.1 ships the deterministic signal provider; a validated model plugs in here later. */
  generateSignals(context: AssessmentContext): RiskSignal[];
}

export interface TrendAnalysisEngine {
  readonly version: string;
  analyze(records: RecordSnapshot): TrendObservation[];
}

export interface RecommendationEngine {
  readonly version: string;
  recommend(context: AssessmentContext): RecommendedNextStep[];
}

export interface ExplanationEngine {
  readonly version: string;
  /** Adds why-noticed / what-could-clarify renderings for a signal. */
  explain(signal: RiskSignal, context: AssessmentContext): RiskSignal;
}

export interface ClinicianSummaryGenerator {
  readonly version: string;
  generate(subjectId: string, assessment: PredictiveHealthAssessment): ClinicianSummary;
}

export type ClinicianSummary = {
  generatedAt: string;
  mainSymptoms: string[];
  onsetAndDuration: string;
  progression: string;
  relevantHistory: string[];
  medications: string[];
  allergies: string[];
  recentVitals: string[];
  relevantLabs: string[];
  lifestyleContext: string[];
  detectedSignals: string[];
  missingInformation: string[];
  questionsToAsk: string[];
  assessmentId: string;
  rulesetVersion: string;
  engineVersion: string;
  statement: string;
};

/**
 * LLM boundary — REPHRASING ONLY. Implementations receive fully-formed
 * engine output and may only adjust wording. They must never change
 * urgency, safety alerts, or add/remove findings.
 */
export interface LLMFormatter {
  readonly id: string;
  rephrase(text: string, readingLevel: "plain" | "detailed"): string;
}

export interface AuditService {
  record(event: {
    subjectId: string;
    action: string;
    resource: string;
    outcome: "ok" | "denied" | "error";
    meta?: Record<string, string | number | boolean | null>;
  }): Promise<void>;
}

/* ---------------- Shared snapshots ---------------- */

export type ProfileSnapshot = {
  ageYears: number | null;
  sexAtBirth: "male" | "female" | "intersex" | "undisclosed" | null;
  pregnancyPossibility: boolean;
  heightCm: number | null;
  weightKg: number | null;
  waistCm: number | null;
  conditions: { name: string; source: "user_reported" | "clinician_confirmed"; status: string }[];
  medications: { name: string; strength: string | null; frequency: string | null }[];
  allergies: { substance: string; reaction: string | null }[];
  lifestyle: {
    sleepHours: number | null;
    sleepQuality: string | null;
    activityMinutesWeek: number | null;
    sedentaryHours: number | null;
    fruitsVegFrequency: string | null;
    proteinSources: string | null;
    waterGlasses: number | null;
    tobacco: string | null;
    alcohol: string | null;
    stressLevel: string | null;
    shiftWork: boolean;
  } | null;
  dietaryPref: string | null;
  languagePref: string;
};

export type RecordSnapshot = {
  symptoms: TriagedSymptom[];
  vitals: (TriagedVitals & { measuredAt: string })[];
  labs: { testName: string; value: number; unit: string; collectedAt: string | null }[];
  lifestyleEntries: NonNullable<ProfileSnapshot["lifestyle"]>[];
  assessmentHistory: { createdAt: string; urgency: UrgencyLevel }[];
};

export type AssessmentContext = {
  subjectId: string;
  profile: ProfileSnapshot;
  records: RecordSnapshot;
  quality: { completeness: number; warnings: QualityWarning[]; missingInformation: string[] };
  bmi: number | null;
  languagePref: "en" | "hi";
};

/* ---------------- Consent scopes ---------------- */

export const CONSENT_SCOPES = [
  "health_profile",
  "assessment",
  "trends",
  "ai_processing",
  "clinician_sharing",
  "notifications",
  "connected_devices",
  "record_import",
  "research",
  "care_navigation",
] as const;

export type ConsentScope = (typeof CONSENT_SCOPES)[number];

/** Scopes required before an assessment may run. */
export const REQUIRED_FOR_ASSESSMENT: ConsentScope[] = ["health_profile", "assessment"];

/* ---------------- API response shapes (fixed for UI + routes) ---------------- */

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; code: string };
export type ApiResult<T> = ApiOk<T> | ApiErr;

export type SessionPayload = { subjectId: string; demo: true; killSwitch: boolean };

export type ConsentState = {
  scopes: Record<ConsentScope, boolean>;
  updatedAt: string;
};

export type IntakeBucket =
  | "symptoms"
  | "conditions"
  | "medications"
  | "allergies"
  | "lifestyle"
  | "vitals"
  | "labs";

export type IntakeEntry = { id: string; bucket: IntakeBucket; savedAt: string };

export type RunAssessmentResponse = ApiResult<{ assessment: PredictiveHealthAssessment }>;
