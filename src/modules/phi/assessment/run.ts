import "server-only";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  PHI_CONTENT_VERSION,
  PHI_DISCLAIMER,
  PHI_ENGINE_VERSION,
  type AssessmentContext,
  type ClinicianQuestion,
  type PredictiveHealthAssessment,
} from "../contracts";
import { getConsentState, hasRequiredConsent } from "../consent";
import { phiAudit } from "../audit";
import { getKillSwitch } from "../kill-switch";
import { buildSnapshots } from "../snapshot";
import { dataQualityEngine } from "../quality/engine";
import { triageEngine } from "../triage/engine";
import { calcBmi } from "../normalize";
import {
  generatePatterns,
  recommendationEngine,
  riskSignalProvider,
  trendEngine,
} from "./engines";

/* ============================================================
 * NEXURA PHI — ASSESSMENT ASSEMBLER (pipeline position lock)
 *
 *  1. Consent validation            (assessment scope required)
 *  2. Kill-switch check             (incident response)
 *  3. Snapshot build                (DB -> engine projections)
 *  4. Data-quality assessment       (missing != normal)
 *  5. EMERGENCY TRIAGE              (ALWAYS before anything generative;
 *                                    red flags short-circuit the pipeline)
 *  6. Special-population routing    (minors/pregnancy/chronic notices)
 *  7. Risk signals (deterministic)  8. Possible patterns
 *  9. Recommendations              10. Clinician questions
 * 11. Version stamping + audit + persistence
 *
 * The LLM formatter is deliberately NOT in this pipeline. It may
 * only rephrase finished strings at render time and can never
 * change urgency, alerts, or findings.
 * ============================================================ */

export class PhiAssessmentBlockedError extends Error {
  constructor(
    public readonly code: "KILL_SWITCH" | "CONSENT_REQUIRED",
    message: string
  ) {
    super(message);
  }
}

export async function runAssessment(subjectId: string): Promise<PredictiveHealthAssessment> {
  /* 1 — consent */
  const consent = await getConsentState(subjectId);
  if (!hasRequiredConsent(consent)) {
    await phiAudit.record({
      subjectId,
      action: "assessment.blocked",
      resource: "consent",
      outcome: "denied",
      meta: { reason: "required_scopes_not_granted" },
    });
    throw new PhiAssessmentBlockedError("CONSENT_REQUIRED", "Health-profile and assessment consent are required before running an assessment.");
  }

  /* 2 — kill switch */
  if (await getKillSwitch()) {
    await phiAudit.record({
      subjectId,
      action: "assessment.blocked",
      resource: "kill_switch",
      outcome: "denied",
    });
    throw new PhiAssessmentBlockedError("KILL_SWITCH", "Predictive results are temporarily disabled for safety review. Profile, tracking, and consent features remain available.");
  }

  /* 3 — snapshot */
  const { profile, records } = await buildSnapshots(subjectId);

  /* 4 — data quality */
  const quality = dataQualityEngine.assess(profile, records);

  /* 5 — EMERGENCY TRIAGE (position-locked) */
  const bmi = profile.heightCm && profile.weightKg ? calcBmi(profile.weightKg, profile.heightCm) : null;
  const ctx: AssessmentContext = {
    subjectId,
    profile,
    records,
    quality,
    bmi,
    languagePref: profile.languagePref === "hi" ? "hi" : "en",
  };

  const triage = triageEngine.evaluate({
    ageYears: profile.ageYears,
    sexAtBirth: profile.sexAtBirth,
    pregnancyPossibility: profile.pregnancyPossibility,
    symptoms: records.symptoms,
    // Worst-case aggregation across ALL at-rest vitals (escalation bias):
    // triage must not miss an alarm that appeared in any earlier reading.
    vitals: aggregateWorstCaseVitals(records.vitals),
    conditions: profile.conditions.map((c) => c.name),
    medications: profile.medications.map((m) => m.name),
    selfHarmLanguage: records.symptoms.some((s) => s.category === "self_harm"),
    overdoseOrPoisoningSignal: records.symptoms.some((s) => s.category === "overdose"),
    traumaSignal: records.symptoms.some((s) => s.category === "trauma"),
  });

  const redFlagged = triage.urgency === "EMERGENCY_NOW";

  /* 6-10 — analysis layers are SKIPPED entirely when triage escalates to
     EMERGENCY_NOW: the safety message must not compete with analysis. */
  const signals = redFlagged ? [] : riskSignalProvider.generateSignals(ctx);
  const patterns = redFlagged ? [] : generatePatterns(ctx, signals);
  const recommendations = redFlagged
    ? [
        {
          id: "rec-safety-first",
          title: "Follow the safety instruction above first",
          detail: "Other suggestions are paused while a safety message is active. Once you have been seen by a professional, come back and run the assessment again.",
          effort: "low" as const,
          category: "safety" as const,
        },
      ]
    : recommendationEngine.recommend(ctx);
  const trendsAllowed = consent.scopes.trends; // trends consent also governs trend COMPUTATION
  const trends = redFlagged || !trendsAllowed ? [] : trendEngine.analyze(records);

  const clinicianQuestions: ClinicianQuestion[] = redFlagged
    ? []
    : buildClinicianQuestions(ctx);

  const contributingFactors = redFlagged
    ? []
    : [
        ...new Set(
          signals.flatMap((s) => s.contributingInputs).map((input) => friendlyField(input))
        ),
      ].slice(0, 8);

  const protectiveFactors = redFlagged
    ? []
    : buildProtectiveFactors(profile, records);

  const followUpIntervalDays =
    triage.urgency === "EMERGENCY_NOW"
      ? null
      : triage.urgency === "SAME_DAY_MEDICAL_REVIEW"
        ? 2
        : triage.urgency === "PROMPT_APPOINTMENT"
          ? 7
          : 30;

  const assessment: PredictiveHealthAssessment = {
    id: randomUUID(),
    subjectId,
    createdAt: new Date().toISOString(),
    inputDataRange: inputDataRange(records),
    engineVersion: PHI_ENGINE_VERSION,
    rulesetId: triageEngine.id,
    rulesetVersion: triageEngine.version,
    contentVersion: PHI_CONTENT_VERSION,
    dataCompleteness: quality.completeness,
    qualityWarnings: quality.warnings.map((w) => w.message),
    urgency: triage.urgency,
    safetyAlerts: triage.alerts,
    triageOnly: redFlagged,
    riskSignals: signals,
    possiblePatterns: patterns,
    contributingFactors,
    protectiveFactors,
    missingInformation: quality.missingInformation,
    recommendedNextSteps: recommendations,
    clinicianQuestions,
    trends,
    followUpIntervalDays,
    disclaimer: PHI_DISCLAIMER,
    routingNotice: triage.specialRouting,
    audit: { assessmentsRun: records.assessmentHistory.length + 1 },
  };

  /* 11 — persist + audit */
  await db.phiAssessment.create({
    data: {
      subjectId,
      engineVersion: assessment.engineVersion,
      rulesetId: assessment.rulesetId,
      rulesetVersion: assessment.rulesetVersion,
      contentVersion: assessment.contentVersion,
      urgency: assessment.urgency,
      triageOnly: assessment.triageOnly,
      dataCompleteness: assessment.dataCompleteness,
      payload: JSON.stringify(assessment),
      followUpIntervalDays: assessment.followUpIntervalDays,
    },
  });

  /* Clinician summaries are generated on demand by /api/nx/phi/summary. */

  await phiAudit.record({
    subjectId,
    action: "assessment.completed",
    resource: `assessment:${assessment.id}`,
    outcome: "ok",
    meta: {
      urgency: assessment.urgency,
      triage_only: assessment.triageOnly,
      completeness: assessment.dataCompleteness,
      ruleset_version: assessment.rulesetVersion,
      engine_version: assessment.engineVersion,
      matched_rules: triage.matchedRuleIds.join(",") || "none",
    },
  });

  return assessment;
}

/* ---------------- helpers ---------------- */

function friendlyField(field: string): string {
  const map: Record<string, string> = {
    "vitals.systolic": "blood pressure readings",
    "vitals.glucose": "glucose readings",
    "vitals.at_rest": "resting measurements",
    "lifestyle.sleep_hours": "sleep entries",
    "lifestyle.activity_minutes_week": "activity entries",
    "lifestyle.tobacco": "tobacco entry",
    "lifestyle.stress_level": "stress entry",
    "lifestyle.fruits_veg_frequency": "diet entries",
    "profile.height": "height",
    "profile.weight": "weight",
    "labs.hba1c": "HbA1c lab report",
    "labs.ldl": "lipid lab report",
    "symptoms.category": "symptom reports",
    "symptoms.frequency": "symptom frequency",
  };
  return map[field] ?? field;
}

function buildProtectiveFactors(profile: AssessmentContext["profile"], records: AssessmentContext["records"]): string[] {
  const out: string[] = [];
  const ls = profile.lifestyle;
  if (ls?.sleepHours != null && ls.sleepHours >= 7) out.push("Sleep in the healthy range");
  if (ls?.activityMinutesWeek != null && ls.activityMinutesWeek >= 150) out.push("Weekly movement meeting common guidance");
  if (ls?.tobacco === "never") out.push("No tobacco use");
  if (ls?.tobacco === "former") out.push("Tobacco quit — the benefit builds every year");
  if (ls?.fruitsVegFrequency != null && ["daily", "often"].includes(ls.fruitsVegFrequency)) out.push("Regular fruit and vegetable intake");
  if (ls?.stressLevel === "low") out.push("Stress reported as low");
  if (records.vitals.some((v) => v.spo2 != null && v.spo2 >= 95)) out.push("Oxygen saturation readings in the usual range");
  return out;
}

function buildClinicianQuestions(ctx: AssessmentContext): ClinicianQuestion[] {
  const out: ClinicianQuestion[] = [];
  const conditions = ctx.profile.conditions.map((c) => c.name.toLowerCase()).join(" ");
  const ls = ctx.profile.lifestyle;

  if (ctx.records.vitals.some((v) => v.systolic != null && v.systolic >= 140)) {
    out.push({
      id: "q-bp",
      question: "My home blood-pressure readings have been in this range — what follow-up do you advise?",
      reason: "Raised resting readings were recorded.",
    });
  }
  if (ctx.records.labs.some((l) => l.testName.toLowerCase().includes("hba1c") && l.value >= 5.7)) {
    out.push({
      id: "q-hba1c",
      question: "My HbA1c report shows this value — should it be repeated, and over what timeline?",
      reason: "An HbA1c lab entry crossed the common screening threshold.",
    });
  }
  if (ls?.sleepHours != null && ls.sleepHours < 6) {
    out.push({
      id: "q-sleep",
      question: "I regularly sleep fewer than six hours — could this be affecting other things we are tracking?",
      reason: "Sleep entries sit below the usual range.",
    });
  }
  if (/diabet|thyroid|heart|bp|hypertens/i.test(conditions)) {
    out.push({
      id: "q-chronic",
      question: "Given my existing conditions, are there screening checks I should be doing regularly?",
      reason: "An ongoing condition was recorded that may change screening frequency.",
    });
  }
  if (out.length === 0) {
    out.push({
      id: "q-general",
      question: "Based on my family history and lifestyle, which routine screenings make sense for me at my age?",
      reason: "A general preventive-care question is useful when no specific signal was recorded.",
    });
  }
  return out;
}

function inputDataRange(records: AssessmentContext["records"]): { from: string | null; to: string | null } {
  const stamps: number[] = [
    ...records.vitals.map((v) => new Date(v.measuredAt).getTime()),
    ...records.labs.map((l) => (l.collectedAt ? new Date(l.collectedAt).getTime() : 0)),
  ].filter((t) => t > 0);
  if (stamps.length === 0) return { from: null, to: null };
  return {
    from: new Date(Math.min(...stamps)).toISOString(),
    to: new Date(Math.max(...stamps)).toISOString(),
  };
}

/**
 * Worst-case at-rest vitals across history — triage sees the most alarming
 * value ever recorded for each metric (max systolic/diastolic/hr/temp/glucose,
 * min SpO2). Escalation-over-reassurance: an alarm from any reading counts.
 */
function aggregateWorstCaseVitals(
  vitals: AssessmentContext["records"]["vitals"]
): AssessmentContext["records"]["vitals"][number] | null {
  if (vitals.length === 0) return null;
  const rest = vitals.filter((v) => v.atRest);
  const pool = rest.length > 0 ? rest : vitals;
  const latest = pool[0];
  const num = (x: number | null | undefined) => (typeof x === "number" && isFinite(x) ? x : null);
  const worstOf = (
    pick: (a: number, b: number) => number,
    field: "systolic" | "diastolic" | "heartRate" | "temperatureC" | "glucoseMgDl"
  ): number | null | undefined => {
    const vals = pool.map((v) => num(v[field])).filter((x): x is number => x != null);
    return vals.length ? vals.reduce(pick) : latest[field];
  };
  const spo2Vals = pool.map((v) => num(v.spo2)).filter((x): x is number => x != null);
  return {
    systolic: worstOf(Math.max, "systolic"),
    diastolic: worstOf(Math.max, "diastolic"),
    heartRate: worstOf(Math.max, "heartRate"),
    temperatureC: worstOf(Math.max, "temperatureC"),
    glucoseMgDl: worstOf(Math.max, "glucoseMgDl"),
    spo2: spo2Vals.length ? Math.min(...spo2Vals) : latest.spo2,
    atRest: true,
    confidence: latest.confidence ?? null,
    measuredAt: latest.measuredAt,
  };
}
